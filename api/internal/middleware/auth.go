package middleware

import (
	"context"
	"net/http"

	"github.com/your-username/simple-cms/api/internal/models"
	"github.com/your-username/simple-cms/api/internal/sessions"
	"github.com/your-username/simple-cms/api/internal/store"
)

type contextKey string

const sessionTokenKey contextKey = "sessionToken"
const userKey contextKey = "currentUser"

// RequireAuth validates the session cookie, loads the user from the DB, and stores
// the *models.User and session token in the request context.
func RequireAuth(sessionStore *sessions.Store, usersStore *store.UsersStore) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			cookie, err := r.Cookie("session")
			if err != nil {
				http.Error(w, `{"error":"Unauthorized"}`, http.StatusUnauthorized)
				return
			}

			userID, valid, err := sessionStore.Validate(r.Context(), cookie.Value)
			if err != nil || !valid {
				http.Error(w, `{"error":"Unauthorized"}`, http.StatusUnauthorized)
				return
			}

			user, err := usersStore.GetByID(r.Context(), userID)
			if err != nil || user == nil {
				http.Error(w, `{"error":"Unauthorized"}`, http.StatusUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), sessionTokenKey, cookie.Value)
			ctx = context.WithValue(ctx, userKey, user)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// SessionToken retrieves the session token from the request context.
func SessionToken(ctx context.Context) string {
	v, _ := ctx.Value(sessionTokenKey).(string)
	return v
}

// CurrentUser retrieves the authenticated user from the request context.
func CurrentUser(ctx context.Context) *models.User {
	u, _ := ctx.Value(userKey).(*models.User)
	return u
}

// RequirePermission returns middleware that allows admins through unconditionally and
// checks that non-admin users have the given permission. Returns 403 if not.
func RequirePermission(perm string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			user := CurrentUser(r.Context())
			if user == nil {
				http.Error(w, `{"error":"Unauthorized"}`, http.StatusUnauthorized)
				return
			}
			if user.Role == models.RoleAdmin {
				next.ServeHTTP(w, r)
				return
			}
			for _, p := range user.Permissions {
				if p == perm {
					next.ServeHTTP(w, r)
					return
				}
			}
			http.Error(w, `{"error":"Forbidden"}`, http.StatusForbidden)
		})
	}
}

// RequireAdmin returns middleware that only allows users with role = admin.
func RequireAdmin() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			user := CurrentUser(r.Context())
			if user == nil {
				http.Error(w, `{"error":"Unauthorized"}`, http.StatusUnauthorized)
				return
			}
			if user.Role != models.RoleAdmin {
				http.Error(w, `{"error":"Forbidden"}`, http.StatusForbidden)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
