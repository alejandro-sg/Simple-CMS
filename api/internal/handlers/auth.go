package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/your-username/simple-cms/api/internal/config"
	"github.com/your-username/simple-cms/api/internal/middleware"
	"github.com/your-username/simple-cms/api/internal/sessions"
	"github.com/your-username/simple-cms/api/internal/store"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	cfg      *config.Config
	sessions *sessions.Store
	settings *store.SettingsStore
	users    *store.UsersStore
}

func NewAuthHandler(cfg *config.Config, sessions *sessions.Store, settings *store.SettingsStore, users *store.UsersStore) *AuthHandler {
	return &AuthHandler{cfg: cfg, sessions: sessions, settings: settings, users: users}
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Username string `json:"username"`
		Password string `json:"password"`
		Code     string `json:"code"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "Invalid request", http.StatusBadRequest)
		return
	}

	user, passwordHash, err := h.users.GetByUsername(r.Context(), body.Username)
	if err != nil {
		jsonError(w, "Internal error", http.StatusInternalServerError)
		return
	}
	if user == nil {
		jsonError(w, "Incorrect username or password", http.StatusUnauthorized)
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(body.Password)); err != nil {
		jsonError(w, "Incorrect username or password", http.StatusUnauthorized)
		return
	}

	// Check if TOTP is enabled for this user.
	totpEnabled, totpValid, err := ValidateTOTPForUser(h.users, r.Context(), user.ID, body.Code)
	if err != nil {
		jsonError(w, "Internal error", http.StatusInternalServerError)
		return
	}
	if totpEnabled && body.Code == "" {
		// Password correct but no TOTP code provided — tell the client to ask for one.
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]any{"requiresTOTP": true})
		return
	}
	if totpEnabled && !totpValid {
		jsonError(w, "Invalid authenticator code", http.StatusUnauthorized)
		return
	}

	token, err := h.sessions.Create(r.Context(), h.cfg.SessionTTLHours, user.ID)
	if err != nil {
		jsonError(w, "Internal error", http.StatusInternalServerError)
		return
	}

	maxAge := h.cfg.SessionTTLHours * 3600
	http.SetCookie(w, &http.Cookie{
		Name:     "session",
		Value:    token,
		Path:     "/",
		MaxAge:   maxAge,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteNoneMode,
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"ok": true})
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	token := middleware.SessionToken(r.Context())
	if token != "" {
		h.sessions.Delete(r.Context(), token)
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "session",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		Expires:  time.Unix(0, 0),
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteNoneMode,
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"ok": true})
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r.Context())
	if user == nil {
		jsonError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	respondJSON(w, map[string]any{
		"ok":          true,
		"username":    user.Username,
		"role":        user.Role,
		"permissions": user.Permissions,
	})
}

func jsonError(w http.ResponseWriter, msg string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	fmt.Fprintf(w, `{"error":%q}`, msg)
}
