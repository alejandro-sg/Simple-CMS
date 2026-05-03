package sessions

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"fmt"
	"time"
)

type Store struct {
	db *sql.DB
}

func NewStore(db *sql.DB) *Store {
	return &Store{db: db}
}

// Create generates a new session token and stores it in the DB with the associated userID.
func (s *Store) Create(ctx context.Context, ttlHours int, userID string) (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("generate token: %w", err)
	}
	token := hex.EncodeToString(b)
	expiresAt := time.Now().UTC().Add(time.Duration(ttlHours) * time.Hour).Format(time.RFC3339)

	_, err := s.db.ExecContext(ctx,
		"INSERT INTO sessions (token, expires_at, user_id) VALUES (?, ?, ?)", token, expiresAt, userID)
	if err != nil {
		return "", err
	}
	return token, nil
}

// Validate checks that the token exists and has not expired. Returns the userID on success.
func (s *Store) Validate(ctx context.Context, token string) (userID string, valid bool, err error) {
	var expiresAt string
	err = s.db.QueryRowContext(ctx,
		"SELECT expires_at, user_id FROM sessions WHERE token = ?", token).Scan(&expiresAt, &userID)
	if err == sql.ErrNoRows {
		return "", false, nil
	}
	if err != nil {
		return "", false, err
	}

	exp, err := time.Parse(time.RFC3339, expiresAt)
	if err != nil {
		return "", false, err
	}
	if !time.Now().UTC().Before(exp) {
		return "", false, nil
	}
	return userID, true, nil
}

// Delete removes a session token.
func (s *Store) Delete(ctx context.Context, token string) error {
	_, err := s.db.ExecContext(ctx, "DELETE FROM sessions WHERE token = ?", token)
	return err
}

// Cleanup removes all expired sessions.
func (s *Store) Cleanup(ctx context.Context) error {
	_, err := s.db.ExecContext(ctx,
		"DELETE FROM sessions WHERE expires_at <= strftime('%Y-%m-%dT%H:%M:%SZ','now')")
	return err
}
