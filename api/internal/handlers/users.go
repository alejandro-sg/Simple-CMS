package handlers

import (
	"encoding/json"
	"net/http"
	"regexp"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/your-username/simple-cms/api/internal/middleware"
	"github.com/your-username/simple-cms/api/internal/models"
	"github.com/your-username/simple-cms/api/internal/store"
	"golang.org/x/crypto/bcrypt"
)

var usernameRe = regexp.MustCompile(`^[a-zA-Z0-9_-]{3,30}$`)

type UsersHandler struct {
	users *store.UsersStore
}

func NewUsersHandler(users *store.UsersStore) *UsersHandler {
	return &UsersHandler{users: users}
}

// List — GET /api/admin/users
func (h *UsersHandler) List(w http.ResponseWriter, r *http.Request) {
	users, err := h.users.List(r.Context())
	if err != nil {
		jsonError(w, "Internal error", http.StatusInternalServerError)
		return
	}
	respondJSON(w, map[string]any{"users": users})
}

// Create — POST /api/admin/users
func (h *UsersHandler) Create(w http.ResponseWriter, r *http.Request) {
	var in models.CreateUserInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		jsonError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	in.Username = strings.TrimSpace(in.Username)
	if !usernameRe.MatchString(in.Username) {
		jsonError(w, "username must be 3–30 characters: letters, digits, underscores, hyphens only", http.StatusBadRequest)
		return
	}
	if len(in.Password) < 12 {
		jsonError(w, "password must be at least 12 characters", http.StatusBadRequest)
		return
	}
	if in.Role != models.RoleAdmin && in.Role != models.RoleUser {
		in.Role = models.RoleUser
	}
	if in.Permissions == nil {
		in.Permissions = []string{}
	}

	// Validate permissions
	validPerms := make(map[string]bool, len(models.AllGrantablePermissions))
	for _, p := range models.AllGrantablePermissions {
		validPerms[p] = true
	}
	for _, p := range in.Permissions {
		if !validPerms[p] {
			jsonError(w, "invalid permission: "+p, http.StatusBadRequest)
			return
		}
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(in.Password), bcrypt.DefaultCost)
	if err != nil {
		jsonError(w, "Internal error", http.StatusInternalServerError)
		return
	}

	user, err := h.users.Create(r.Context(), in, string(hash))
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE constraint failed") {
			jsonError(w, "username already exists", http.StatusConflict)
			return
		}
		jsonError(w, "Internal error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	respondJSON(w, user)
}

// Update — PATCH /api/admin/users/{id}
// Accepts: permissions []string, password string (optional)
func (h *UsersHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	caller := middleware.CurrentUser(r.Context())

	var body struct {
		Permissions *[]string `json:"permissions"`
		Password    string    `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if body.Permissions != nil {
		// Validate each permission
		validPerms := make(map[string]bool, len(models.AllGrantablePermissions))
		for _, p := range models.AllGrantablePermissions {
			validPerms[p] = true
		}
		for _, p := range *body.Permissions {
			if !validPerms[p] {
				jsonError(w, "invalid permission: "+p, http.StatusBadRequest)
				return
			}
		}

		// Cannot change your own permissions via this endpoint (safety)
		if caller != nil && caller.ID == id {
			jsonError(w, "cannot modify your own permissions", http.StatusForbidden)
			return
		}

		user, err := h.users.UpdatePermissions(r.Context(), id, *body.Permissions)
		if err != nil {
			jsonError(w, "Internal error", http.StatusInternalServerError)
			return
		}
		if user == nil {
			jsonError(w, "User not found", http.StatusNotFound)
			return
		}
	}

	if body.Password != "" {
		if len(body.Password) < 12 {
			jsonError(w, "password must be at least 12 characters", http.StatusBadRequest)
			return
		}
		hash, err := bcrypt.GenerateFromPassword([]byte(body.Password), bcrypt.DefaultCost)
		if err != nil {
			jsonError(w, "Internal error", http.StatusInternalServerError)
			return
		}
		if err := h.users.UpdatePassword(r.Context(), id, string(hash)); err != nil {
			jsonError(w, "Internal error", http.StatusInternalServerError)
			return
		}
	}

	// Return the updated user
	user, err := h.users.GetByID(r.Context(), id)
	if err != nil {
		jsonError(w, "Internal error", http.StatusInternalServerError)
		return
	}
	if user == nil {
		jsonError(w, "User not found", http.StatusNotFound)
		return
	}
	respondJSON(w, user)
}

// Delete — DELETE /api/admin/users/{id}
func (h *UsersHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	caller := middleware.CurrentUser(r.Context())

	if caller != nil && caller.ID == id {
		jsonError(w, "cannot delete yourself", http.StatusForbidden)
		return
	}

	// Prevent deleting the last admin
	target, err := h.users.GetByID(r.Context(), id)
	if err != nil {
		jsonError(w, "Internal error", http.StatusInternalServerError)
		return
	}
	if target == nil {
		jsonError(w, "User not found", http.StatusNotFound)
		return
	}
	if target.Role == models.RoleAdmin {
		count, err := h.users.CountAdmins(r.Context())
		if err != nil {
			jsonError(w, "Internal error", http.StatusInternalServerError)
			return
		}
		if count <= 1 {
			jsonError(w, "cannot delete the last admin", http.StatusForbidden)
			return
		}
	}

	if err := h.users.Delete(r.Context(), id); err != nil {
		jsonError(w, "Internal error", http.StatusInternalServerError)
		return
	}
	respondJSON(w, map[string]bool{"ok": true})
}

// Permissions — GET /api/admin/users/permissions
func (h *UsersHandler) Permissions(w http.ResponseWriter, r *http.Request) {
	respondJSON(w, map[string]any{"permissions": models.AllGrantablePermissions})
}
