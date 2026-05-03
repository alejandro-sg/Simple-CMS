package store

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"regexp"
	"strings"

	"github.com/alejandro-sg/Simple-CMS/api/internal/models"
)

type ItemStore struct {
	db *sql.DB
}

func NewItemStore(db *sql.DB) *ItemStore {
	return &ItemStore{db: db}
}

// List returns inventory items matching the given filters.
func (s *ItemStore) List(ctx context.Context, f models.ListFilters) ([]models.Item, error) {
	query := `SELECT id, title, slug, brand, category, condition, type, description,
	          status, post_status, quantity, featured, price,
	          dim_width, dim_depth, dim_height, dim_weight,
	          item_date, images, tags, updated_at, created_at
	          FROM items WHERE 1=1`
	args := []any{}

	if !f.AdminMode {
		query += " AND post_status = 'Published'"
	}
	if f.Status != "" {
		query += " AND status = ?"
		args = append(args, f.Status)
	}
	if len(f.StatusIn) > 0 {
		placeholders := strings.Repeat("?,", len(f.StatusIn))
		placeholders = placeholders[:len(placeholders)-1]
		query += " AND status IN (" + placeholders + ")"
		for _, s := range f.StatusIn {
			args = append(args, s)
		}
	}
	if f.Featured != nil {
		v := 0
		if *f.Featured {
			v = 1
		}
		query += " AND featured = ?"
		args = append(args, v)
	}
	if f.Category != "" {
		query += " AND category = ?"
		args = append(args, f.Category)
	}
	if f.Type != "" {
		query += " AND type = ?"
		args = append(args, f.Type)
	}
	if f.QuantityMin != nil {
		query += " AND quantity >= ?"
		args = append(args, *f.QuantityMin)
	}

	query += " ORDER BY updated_at DESC"

	if f.Limit > 0 {
		query += " LIMIT ?"
		args = append(args, f.Limit)
	}

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []models.Item
	for rows.Next() {
		item, err := scanItem(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	if items == nil {
		items = []models.Item{}
	}
	return items, rows.Err()
}

// GetBySlug returns a single published item by slug.
func (s *ItemStore) GetBySlug(ctx context.Context, slug string, adminMode bool) (*models.Item, error) {
	query := `SELECT id, title, slug, brand, category, condition, type, description,
	          status, post_status, quantity, featured, price,
	          dim_width, dim_depth, dim_height, dim_weight,
	          item_date, images, tags, updated_at, created_at
	          FROM items WHERE slug = ?`
	if !adminMode {
		query += " AND post_status = 'Published'"
	}

	row := s.db.QueryRowContext(ctx, query, slug)
	item, err := scanItemRow(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return item, err
}

// GetByID returns an item by ID (admin use).
func (s *ItemStore) GetByID(ctx context.Context, id string) (*models.Item, error) {
	query := `SELECT id, title, slug, brand, category, condition, type, description,
	          status, post_status, quantity, featured, price,
	          dim_width, dim_depth, dim_height, dim_weight,
	          item_date, images, tags, updated_at, created_at
	          FROM items WHERE id = ?`
	row := s.db.QueryRowContext(ctx, query, id)
	item, err := scanItemRow(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return item, err
}

// Create inserts a new inventory item. Slug and tags are auto-computed if not provided.
func (s *ItemStore) Create(ctx context.Context, in models.CreateItemInput) (*models.Item, error) {
	slug := in.Slug
	if slug == "" {
		slug = Slugify(in.Title)
	}
	slug, err := s.uniqueSlug(ctx, slug, "")
	if err != nil {
		return nil, err
	}

	tags := generateTags(in.Title, in.Type, in.Brand, in.Category, in.Condition, in.Description)
	imagesJSON, _ := json.Marshal(nonNilSlice(in.Images))
	tagsJSON, _ := json.Marshal(tags)

	status := in.Status
	if status == "" {
		status = "In Stock"
	}
	postStatus := in.PostStatus
	if postStatus == "" {
		postStatus = "Draft"
	}

	query := `INSERT INTO items
	          (title, slug, brand, category, condition, type, description, status, post_status,
	           quantity, featured, price, dim_width, dim_depth, dim_height, dim_weight,
	           item_date, images, tags)
	          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
	          RETURNING id, title, slug, brand, category, condition, type, description,
	          status, post_status, quantity, featured, price,
	          dim_width, dim_depth, dim_height, dim_weight,
	          item_date, images, tags, updated_at, created_at`

	row := s.db.QueryRowContext(ctx, query,
		in.Title, slug, in.Brand, in.Category, in.Condition, in.Type, in.Description,
		status, postStatus, in.Quantity, boolToInt(in.Featured), in.Price,
		in.Dimensions.Width, in.Dimensions.Depth, in.Dimensions.Height, in.Dimensions.Weight,
		in.Date, string(imagesJSON), string(tagsJSON),
	)
	return scanItemRow(row)
}

// Update modifies an existing item by ID.
func (s *ItemStore) Update(ctx context.Context, id string, in models.UpdateItemInput) (*models.Item, error) {
	existing, err := s.GetByID(ctx, id)
	if err != nil || existing == nil {
		return nil, err
	}

	slug := in.Slug
	if slug == "" {
		slug = Slugify(in.Title)
	}
	// Only enforce uniqueness if the slug changed
	if slug != existing.Slug {
		slug, err = s.uniqueSlug(ctx, slug, id)
		if err != nil {
			return nil, err
		}
	}

	tags := generateTags(in.Title, in.Type, in.Brand, in.Category, in.Condition, in.Description)
	imagesJSON, _ := json.Marshal(nonNilSlice(in.Images))
	tagsJSON, _ := json.Marshal(tags)

	query := `UPDATE items SET
	          title=?, slug=?, brand=?, category=?, condition=?, type=?, description=?,
	          status=?, post_status=?, quantity=?, featured=?, price=?,
	          dim_width=?, dim_depth=?, dim_height=?, dim_weight=?,
	          item_date=?, images=?, tags=?,
	          updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
	          WHERE id=?
	          RETURNING id, title, slug, brand, category, condition, type, description,
	          status, post_status, quantity, featured, price,
	          dim_width, dim_depth, dim_height, dim_weight,
	          item_date, images, tags, updated_at, created_at`

	row := s.db.QueryRowContext(ctx, query,
		in.Title, slug, in.Brand, in.Category, in.Condition, in.Type, in.Description,
		in.Status, in.PostStatus, in.Quantity, boolToInt(in.Featured), in.Price,
		in.Dimensions.Width, in.Dimensions.Depth, in.Dimensions.Height, in.Dimensions.Weight,
		in.Date, string(imagesJSON), string(tagsJSON),
		id,
	)
	return scanItemRow(row)
}

// Delete removes an item by ID.
func (s *ItemStore) Delete(ctx context.Context, id string) error {
	_, err := s.db.ExecContext(ctx, "DELETE FROM items WHERE id = ?", id)
	return err
}

// --- helpers ---

func (s *ItemStore) uniqueSlug(ctx context.Context, base, excludeID string) (string, error) {
	candidate := base
	for i := 2; ; i++ {
		var exists bool
		var err error
		if excludeID == "" {
			err = s.db.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM items WHERE slug=?)", candidate).Scan(&exists)
		} else {
			err = s.db.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM items WHERE slug=? AND id!=?)", candidate, excludeID).Scan(&exists)
		}
		if err != nil {
			return "", err
		}
		if !exists {
			return candidate, nil
		}
		candidate = fmt.Sprintf("%s-%d", base, i)
	}
}

var nonAlphanumRe = regexp.MustCompile(`[^a-z0-9]+`)

func Slugify(s string) string {
	s = strings.ToLower(s)
	s = nonAlphanumRe.ReplaceAllString(s, "-")
	s = strings.Trim(s, "-")
	if s == "" {
		s = "item"
	}
	return s
}

var stopWords = map[string]bool{
	"a": true, "an": true, "the": true, "and": true, "or": true, "but": true,
	"in": true, "on": true, "at": true, "to": true, "for": true, "of": true,
	"with": true, "is": true, "it": true, "its": true, "this": true, "that": true,
	"are": true, "was": true, "be": true, "has": true, "have": true,
}

var wordRe = regexp.MustCompile(`[^a-z0-9]+`)

func generateTags(fields ...string) []string {
	seen := map[string]bool{}
	var tags []string
	for _, field := range fields {
		words := wordRe.Split(strings.ToLower(field), -1)
		for _, w := range words {
			if len(w) <= 1 || stopWords[w] || seen[w] {
				continue
			}
			seen[w] = true
			tags = append(tags, w)
		}
	}
	return tags
}

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}

func nonNilSlice(s []string) []string {
	if s == nil {
		return []string{}
	}
	return s
}

type scanner interface {
	Scan(dest ...any) error
}

func scanItem(rows *sql.Rows) (models.Item, error) {
	var item models.Item
	var featured int
	var imagesJSON, tagsJSON string
	err := rows.Scan(
		&item.ID, &item.Title, &item.Slug, &item.Brand, &item.Category,
		&item.Condition, &item.Type, &item.Description, &item.Status, &item.PostStatus,
		&item.Quantity, &featured, &item.Price,
		&item.Dimensions.Width, &item.Dimensions.Depth, &item.Dimensions.Height, &item.Dimensions.Weight,
		&item.Date, &imagesJSON, &tagsJSON, &item.UpdatedAt, &item.CreatedAt,
	)
	if err != nil {
		return item, err
	}
	item.Featured = featured == 1
	if err := json.Unmarshal([]byte(imagesJSON), &item.Images); err != nil {
		return item, fmt.Errorf("parse images JSON for item %s: %w", item.ID, err)
	}
	if err := json.Unmarshal([]byte(tagsJSON), &item.Tags); err != nil {
		return item, fmt.Errorf("parse tags JSON for item %s: %w", item.ID, err)
	}
	if item.Images == nil {
		item.Images = []string{}
	}
	if item.Tags == nil {
		item.Tags = []string{}
	}
	return item, nil
}

func scanItemRow(row *sql.Row) (*models.Item, error) {
	var item models.Item
	var featured int
	var imagesJSON, tagsJSON string
	err := row.Scan(
		&item.ID, &item.Title, &item.Slug, &item.Brand, &item.Category,
		&item.Condition, &item.Type, &item.Description, &item.Status, &item.PostStatus,
		&item.Quantity, &featured, &item.Price,
		&item.Dimensions.Width, &item.Dimensions.Depth, &item.Dimensions.Height, &item.Dimensions.Weight,
		&item.Date, &imagesJSON, &tagsJSON, &item.UpdatedAt, &item.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	item.Featured = featured == 1
	if err := json.Unmarshal([]byte(imagesJSON), &item.Images); err != nil {
		return nil, fmt.Errorf("parse images JSON for item %s: %w", item.ID, err)
	}
	if err := json.Unmarshal([]byte(tagsJSON), &item.Tags); err != nil {
		return nil, fmt.Errorf("parse tags JSON for item %s: %w", item.ID, err)
	}
	if item.Images == nil {
		item.Images = []string{}
	}
	if item.Tags == nil {
		item.Tags = []string{}
	}
	return &item, nil
}
