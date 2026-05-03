package handlers

import (
	"encoding/csv"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/alejandro-sg/Simple-CMS/api/internal/models"
	"github.com/alejandro-sg/Simple-CMS/api/internal/store"
)

// CSVColumns defines the exact column order for the import template.
var CSVColumns = []string{
	"title", "brand", "category", "condition", "type",
	"description", "status", "post_status", "quantity", "featured",
	"price", "width_in", "depth_in", "height_in", "weight_lb", "date",
}

type BulkHandler struct {
	store      *store.ItemStore
	revalidate func()
}

func NewBulkHandler(s *store.ItemStore, revalidate func()) *BulkHandler {
	return &BulkHandler{store: s, revalidate: revalidate}
}

// Template serves a downloadable CSV template with headers + one example row.
func (h *BulkHandler) Template(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", `attachment; filename="items-template.csv"`)

	wr := csv.NewWriter(w)
	wr.Write(CSVColumns)
	wr.Write([]string{
		"Example Item Title", // title
		"Brand Name",         // brand
		"Category A",         // category  // Customize categories for your project
		"New",                // condition (New | Like New | Good | Fair | Poor)
		"Type A",             // type
		"Item description goes here.", // description
		"In Stock",   // status     (In Stock | Reserved | Sold)
		"Published",  // post_status (Draft | Published)
		"1",          // quantity
		"false",      // featured   (true | false)
		"650",        // price      (leave blank for "Upon request")
		"60",         // width_in
		"18",         // depth_in
		"32",         // height_in
		"85",         // weight_lb
		"2024-03-15", // date       (YYYY-MM-DD, optional)
	})
	wr.Flush()
}

// Import parses a CSV file and bulk-creates inventory items.
func (h *BulkHandler) Import(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(5 << 20); err != nil {
		jsonError(w, "Invalid form or file too large (max 5 MB)", http.StatusBadRequest)
		return
	}

	file, _, err := r.FormFile("file")
	if err != nil {
		jsonError(w, "Missing file field", http.StatusBadRequest)
		return
	}
	defer file.Close()

	reader := csv.NewReader(file)
	reader.TrimLeadingSpace = true

	rows, err := reader.ReadAll()
	if err != nil {
		jsonError(w, "Could not parse CSV: "+err.Error(), http.StatusBadRequest)
		return
	}
	if len(rows) < 2 {
		jsonError(w, "CSV must have a header row and at least one data row", http.StatusBadRequest)
		return
	}

	// Build column index from the actual header row (case-insensitive, flexible order)
	header := rows[0]
	colIdx := make(map[string]int, len(header))
	for i, h := range header {
		colIdx[strings.ToLower(strings.TrimSpace(h))] = i
	}

	type result struct {
		Row   int    `json:"row"`
		Title string `json:"title"`
		Error string `json:"error,omitempty"`
		ID    string `json:"id,omitempty"`
	}

	var results []result
	created := 0

	for i, row := range rows[1:] {
		rowNum := i + 2 // 1-indexed, accounting for header
		title := col(row, colIdx, "title")
		if title == "" {
			results = append(results, result{Row: rowNum, Title: "(empty)", Error: "title is required"})
			continue
		}

		input := models.CreateItemInput{
			Title:       title,
			Brand:       col(row, colIdx, "brand"),
			Category:    col(row, colIdx, "category"),
			Condition:   col(row, colIdx, "condition"),
			Type:        col(row, colIdx, "type"),
			Description: col(row, colIdx, "description"),
			Status:      colDefault(row, colIdx, "status", "In Stock"),
			PostStatus:  colDefault(row, colIdx, "post_status", "Draft"),
			Quantity:    colInt(row, colIdx, "quantity", 1),
			Featured:    colBool(row, colIdx, "featured"),
			Price:       colFloat(row, colIdx, "price"),
			Dimensions: models.Dimensions{
				Width:  colFloat(row, colIdx, "width_in"),
				Depth:  colFloat(row, colIdx, "depth_in"),
				Height: colFloat(row, colIdx, "height_in"),
				Weight: colFloat(row, colIdx, "weight_lb"),
			},
			Date:   colPtr(row, colIdx, "date"),
			Images: []string{},
		}

		item, err := h.store.Create(r.Context(), input)
		if err != nil {
			results = append(results, result{Row: rowNum, Title: title, Error: err.Error()})
			continue
		}
		results = append(results, result{Row: rowNum, Title: title, ID: item.ID})
		created++
	}

	if created > 0 {
		h.revalidate()
	}

	w.WriteHeader(http.StatusOK)
	respondJSON(w, map[string]any{
		"created": created,
		"total":   len(rows) - 1,
		"results": results,
	})
}

// --- CSV parsing helpers ---

func col(row []string, idx map[string]int, name string) string {
	i, ok := idx[name]
	if !ok || i >= len(row) {
		return ""
	}
	return strings.TrimSpace(row[i])
}

func colDefault(row []string, idx map[string]int, name, def string) string {
	v := col(row, idx, name)
	if v == "" {
		return def
	}
	return v
}

func colInt(row []string, idx map[string]int, name string, def int) int {
	v := col(row, idx, name)
	if v == "" {
		return def
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return def
	}
	return n
}

func colBool(row []string, idx map[string]int, name string) bool {
	v := strings.ToLower(col(row, idx, name))
	return v == "true" || v == "yes" || v == "1"
}

func colFloat(row []string, idx map[string]int, name string) *float64 {
	v := col(row, idx, name)
	if v == "" {
		return nil
	}
	f, err := strconv.ParseFloat(v, 64)
	if err != nil {
		return nil
	}
	return &f
}

func colPtr(row []string, idx map[string]int, name string) *string {
	v := col(row, idx, name)
	if v == "" {
		return nil
	}
	s := fmt.Sprintf("%s", v)
	return &s
}
