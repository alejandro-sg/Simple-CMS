package store

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"

	"github.com/your-username/simple-cms/api/internal/models"
)

type UsersStore struct {
	db *sql.DB
}

func NewUsersStore(db *sql.DB) *UsersStore {
	return &UsersStore{db: db}
}

// Create inserts a new user. passwordHash is stored directly (caller must bcrypt it).
func (s *UsersStore) Create(ctx context.Context, in models.CreateUserInput, passwordHash string) (*models.User, error) {
	role := in.Role
	if role == "" {
		role = models.RoleUser
	}
	perms := in.Permissions
	if perms == nil {
		perms = []string{}
	}
	permsJSON, err := json.Marshal(perms)
	if err != nil {
		return nil, err
	}

	var u models.User
	var permsStr string
	err = s.db.QueryRowContext(ctx, `
		INSERT INTO users (username, password_hash, role, permissions)
		VALUES (?, ?, ?, ?)
		RETURNING id, username, role, permissions, created_at
	`, in.Username, passwordHash, role, string(permsJSON)).
		Scan(&u.ID, &u.Username, &u.Role, &permsStr, &u.CreatedAt)
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal([]byte(permsStr), &u.Permissions); err != nil {
		u.Permissions = []string{}
	}
	return &u, nil
}

// GetByUsername returns the user and password hash, or (nil, "", nil) if not found.
func (s *UsersStore) GetByUsername(ctx context.Context, username string) (*models.User, string, error) {
	var u models.User
	var passwordHash, permsStr string
	err := s.db.QueryRowContext(ctx, `
		SELECT id, username, role, permissions, created_at, password_hash
		FROM users WHERE username = ? COLLATE NOCASE
	`, username).Scan(&u.ID, &u.Username, &u.Role, &permsStr, &u.CreatedAt, &passwordHash)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, "", nil
	}
	if err != nil {
		return nil, "", err
	}
	if err := json.Unmarshal([]byte(permsStr), &u.Permissions); err != nil {
		u.Permissions = []string{}
	}
	return &u, passwordHash, nil
}

// GetByID returns the user, or nil if not found.
func (s *UsersStore) GetByID(ctx context.Context, id string) (*models.User, error) {
	var u models.User
	var permsStr string
	err := s.db.QueryRowContext(ctx, `
		SELECT id, username, role, permissions, created_at
		FROM users WHERE id = ?
	`, id).Scan(&u.ID, &u.Username, &u.Role, &permsStr, &u.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal([]byte(permsStr), &u.Permissions); err != nil {
		u.Permissions = []string{}
	}
	return &u, nil
}

// List returns all users.
func (s *UsersStore) List(ctx context.Context) ([]*models.User, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, username, role, permissions, created_at
		FROM users ORDER BY created_at ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []*models.User
	for rows.Next() {
		var u models.User
		var permsStr string
		if err := rows.Scan(&u.ID, &u.Username, &u.Role, &permsStr, &u.CreatedAt); err != nil {
			return nil, err
		}
		if err := json.Unmarshal([]byte(permsStr), &u.Permissions); err != nil {
			u.Permissions = []string{}
		}
		users = append(users, &u)
	}
	if users == nil {
		users = []*models.User{}
	}
	return users, rows.Err()
}

// UpdatePermissions sets the permissions for a user. Returns nil user if not found.
func (s *UsersStore) UpdatePermissions(ctx context.Context, id string, permissions []string) (*models.User, error) {
	if permissions == nil {
		permissions = []string{}
	}
	permsJSON, err := json.Marshal(permissions)
	if err != nil {
		return nil, err
	}

	var u models.User
	var permsStr string
	err = s.db.QueryRowContext(ctx, `
		UPDATE users SET permissions = ?
		WHERE id = ?
		RETURNING id, username, role, permissions, created_at
	`, string(permsJSON), id).Scan(&u.ID, &u.Username, &u.Role, &permsStr, &u.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal([]byte(permsStr), &u.Permissions); err != nil {
		u.Permissions = []string{}
	}
	return &u, nil
}

// UpdatePassword sets the password hash for a user.
func (s *UsersStore) UpdatePassword(ctx context.Context, id, passwordHash string) error {
	_, err := s.db.ExecContext(ctx, `UPDATE users SET password_hash = ? WHERE id = ?`, passwordHash, id)
	return err
}

// Delete removes a user by ID.
func (s *UsersStore) Delete(ctx context.Context, id string) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM users WHERE id = ?`, id)
	return err
}

// Count returns the total number of users.
func (s *UsersStore) Count(ctx context.Context) (int, error) {
	var n int
	err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM users`).Scan(&n)
	return n, err
}

// CountAdmins returns the number of users with role = 'admin'.
func (s *UsersStore) CountAdmins(ctx context.Context) (int, error) {
	var n int
	err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM users WHERE role = 'admin'`).Scan(&n)
	return n, err
}

// --- TOTP methods ---

// GetTOTPSecret returns the active and pending TOTP secrets for a user.
func (s *UsersStore) GetTOTPSecret(ctx context.Context, userID string) (secret, pending string, err error) {
	err = s.db.QueryRowContext(ctx, `
		SELECT totp_secret, totp_pending FROM users WHERE id = ?
	`, userID).Scan(&secret, &pending)
	if errors.Is(err, sql.ErrNoRows) {
		return "", "", nil
	}
	return secret, pending, err
}

// SetTOTPSecret sets the active TOTP secret for a user.
func (s *UsersStore) SetTOTPSecret(ctx context.Context, userID, secret string) error {
	_, err := s.db.ExecContext(ctx, `UPDATE users SET totp_secret = ? WHERE id = ?`, secret, userID)
	return err
}

// SetTOTPPending sets the pending TOTP secret for a user.
func (s *UsersStore) SetTOTPPending(ctx context.Context, userID, pending string) error {
	_, err := s.db.ExecContext(ctx, `UPDATE users SET totp_pending = ? WHERE id = ?`, pending, userID)
	return err
}

// ClearTOTP removes both TOTP secrets for a user.
func (s *UsersStore) ClearTOTP(ctx context.Context, userID string) error {
	_, err := s.db.ExecContext(ctx, `UPDATE users SET totp_secret = '', totp_pending = '' WHERE id = ?`, userID)
	return err
}
