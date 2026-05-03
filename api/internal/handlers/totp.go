package handlers

import (
	"context"
	"encoding/json"
	"log"
	"net/http"

	"github.com/your-username/simple-cms/api/internal/middleware"
	"github.com/your-username/simple-cms/api/internal/store"
	"github.com/pquerna/otp/totp"
)

const (
	totpIssuer  = "Simple-CMS"
	totpAccount = "admin"
)

type TOTPHandler struct {
	settings *store.SettingsStore
	users    *store.UsersStore
}

func NewTOTPHandler(settings *store.SettingsStore, users *store.UsersStore) *TOTPHandler {
	return &TOTPHandler{settings: settings, users: users}
}

// Status returns whether TOTP is currently enabled for the calling user.
// This endpoint does NOT require auth (kept public for compatibility).
// When called with an active session, checks the user's TOTP; otherwise returns false.
func (h *TOTPHandler) Status(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r.Context())
	if user == nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]bool{"enabled": false})
		return
	}
	secret, _, err := h.users.GetTOTPSecret(r.Context(), user.ID)
	if err != nil {
		jsonError(w, "Internal error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"enabled": secret != ""})
}

// Setup generates a new TOTP secret and returns the otpauth:// URL for QR rendering.
// The secret is stored as "pending" until confirmed with a valid code.
func (h *TOTPHandler) Setup(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r.Context())
	if user == nil {
		jsonError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      totpIssuer,
		AccountName: user.Username,
	})
	if err != nil {
		jsonError(w, "Failed to generate TOTP secret", http.StatusInternalServerError)
		return
	}

	if err := h.users.SetTOTPPending(r.Context(), user.ID, key.Secret()); err != nil {
		jsonError(w, "Internal error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"secret": key.Secret(),
		"url":    key.URL(),
	})
}

// Confirm validates the user's first code against the pending secret and promotes it to active.
func (h *TOTPHandler) Confirm(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r.Context())
	if user == nil {
		jsonError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var body struct {
		Code string `json:"code"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Code == "" {
		jsonError(w, "code is required", http.StatusBadRequest)
		return
	}

	_, pending, err := h.users.GetTOTPSecret(r.Context(), user.ID)
	if err != nil || pending == "" {
		jsonError(w, "No pending TOTP setup — call /setup first", http.StatusBadRequest)
		return
	}

	if !totp.Validate(body.Code, pending) {
		jsonError(w, "Invalid code", http.StatusUnauthorized)
		return
	}

	if err := h.users.SetTOTPSecret(r.Context(), user.ID, pending); err != nil {
		jsonError(w, "Internal error", http.StatusInternalServerError)
		return
	}
	if err := h.users.SetTOTPPending(r.Context(), user.ID, ""); err != nil {
		log.Printf("totp confirm: clear pending: %v", err)
		// Non-fatal — TOTP is already active; pending row clears on next confirm attempt
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"ok": true})
}

// Disable removes the TOTP secret, requiring a valid current code to prevent accidental lockout.
func (h *TOTPHandler) Disable(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r.Context())
	if user == nil {
		jsonError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var body struct {
		Code string `json:"code"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Code == "" {
		jsonError(w, "code is required", http.StatusBadRequest)
		return
	}

	secret, _, err := h.users.GetTOTPSecret(r.Context(), user.ID)
	if err != nil || secret == "" {
		jsonError(w, "TOTP is not enabled", http.StatusBadRequest)
		return
	}

	if !totp.Validate(body.Code, secret) {
		jsonError(w, "Invalid code", http.StatusUnauthorized)
		return
	}

	if err := h.users.ClearTOTP(r.Context(), user.ID); err != nil {
		jsonError(w, "Internal error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"ok": true})
}

// ValidateTOTPForUser checks a TOTP code against the user's active secret.
// Returns (enabled, valid, error).
func ValidateTOTPForUser(users *store.UsersStore, ctx context.Context, userID, code string) (enabled bool, valid bool, err error) {
	secret, _, err := users.GetTOTPSecret(ctx, userID)
	if err != nil {
		return false, false, err
	}
	if secret == "" {
		return false, false, nil
	}
	return true, totp.Validate(code, secret), nil
}
