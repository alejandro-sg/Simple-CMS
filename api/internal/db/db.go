package db

import (
	"database/sql"
	_ "embed"
	"fmt"
	"strings"

	_ "github.com/mattn/go-sqlite3"
)

//go:embed migrations/001_init.sql
var schema001 string

//go:embed migrations/002_users.sql
var schema002 string

func Open(path string) (*sql.DB, error) {
	db, err := sql.Open("sqlite3", path+"?_foreign_keys=on")
	if err != nil {
		return nil, fmt.Errorf("open db: %w", err)
	}
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("ping db: %w", err)
	}
	if _, err := db.Exec(schema001); err != nil {
		return nil, fmt.Errorf("run migration 001: %w", err)
	}
	if _, err := db.Exec(schema002); err != nil {
		return nil, fmt.Errorf("run migration 002: %w", err)
	}
	// Add user_id column to sessions; ignore if already exists.
	if _, err := db.Exec(`ALTER TABLE sessions ADD COLUMN user_id TEXT NOT NULL DEFAULT ''`); err != nil {
		if !strings.Contains(err.Error(), "duplicate column name") {
			return nil, fmt.Errorf("alter sessions: %w", err)
		}
	}
	return db, nil
}
