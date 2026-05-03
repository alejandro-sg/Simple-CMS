package store

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/alejandro-sg/Simple-CMS/api/internal/models"
)

type ReviewsStore struct {
	db *sql.DB
}

func NewReviewsStore(db *sql.DB) *ReviewsStore {
	return &ReviewsStore{db: db}
}

func (s *ReviewsStore) Create(ctx context.Context, in models.CreateReviewInput) (*models.Review, error) {
	now := time.Now().UTC().Format(time.RFC3339Nano)
	var r models.Review
	err := s.db.QueryRowContext(ctx, `
		INSERT INTO reviews (rating, feedback, type, name, status, created_at, updated_at)
		VALUES (?, ?, ?, ?, 'New', ?, ?)
		RETURNING id, rating, feedback, type, name, status, created_at, updated_at
	`, in.Rating, in.Feedback, in.Type, in.Name, now, now).
		Scan(&r.ID, &r.Rating, &r.Feedback, &r.Type, &r.Name, &r.Status, &r.CreatedAt, &r.UpdatedAt)
	return &r, err
}

// ListApproved returns all reviews with status = Approved, newest first.
func (s *ReviewsStore) ListApproved(ctx context.Context) ([]models.Review, error) {
	return s.query(ctx, `SELECT id, rating, feedback, type, name, status, created_at, updated_at
		FROM reviews WHERE status = 'Approved' ORDER BY created_at DESC`)
}

// ListAll returns every review regardless of status, newest first.
func (s *ReviewsStore) ListAll(ctx context.Context) ([]models.Review, error) {
	return s.query(ctx, `SELECT id, rating, feedback, type, name, status, created_at, updated_at
		FROM reviews ORDER BY created_at DESC`)
}

// UpdateStatus changes the status of a review (New → Approved / Rejected).
func (s *ReviewsStore) UpdateStatus(ctx context.Context, id, status string) (*models.Review, error) {
	now := time.Now().UTC().Format(time.RFC3339Nano)
	var r models.Review
	err := s.db.QueryRowContext(ctx, `
		UPDATE reviews SET status = ?, updated_at = ? WHERE id = ?
		RETURNING id, rating, feedback, type, name, status, created_at, updated_at
	`, status, now, id).
		Scan(&r.ID, &r.Rating, &r.Feedback, &r.Type, &r.Name, &r.Status, &r.CreatedAt, &r.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return &r, err
}

// Delete removes a review permanently.
func (s *ReviewsStore) Delete(ctx context.Context, id string) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM reviews WHERE id = ?`, id)
	return err
}

func (s *ReviewsStore) query(ctx context.Context, q string, args ...any) ([]models.Review, error) {
	rows, err := s.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var reviews []models.Review
	for rows.Next() {
		var r models.Review
		if err := rows.Scan(&r.ID, &r.Rating, &r.Feedback, &r.Type, &r.Name, &r.Status, &r.CreatedAt, &r.UpdatedAt); err != nil {
			return nil, err
		}
		reviews = append(reviews, r)
	}
	if reviews == nil {
		reviews = []models.Review{}
	}
	return reviews, rows.Err()
}
