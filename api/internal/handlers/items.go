package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/alejandro-sg/Simple-CMS/api/internal/models"
	"github.com/alejandro-sg/Simple-CMS/api/internal/store"
)

type ItemHandler struct {
	store     *store.ItemStore
	revalidate func()
}

func NewItemHandler(s *store.ItemStore, revalidate func()) *ItemHandler {
	return &ItemHandler{store: s, revalidate: revalidate}
}

// --- Public endpoints ---

func (h *ItemHandler) ListPublic(w http.ResponseWriter, r *http.Request) {
	f := parseFilters(r, false)
	items, err := h.store.List(r.Context(), f)
	if err != nil {
		jsonError(w, "Internal error", http.StatusInternalServerError)
		return
	}
	respondJSON(w, map[string]any{"items": items})
}

func (h *ItemHandler) GetPublicBySlug(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	item, err := h.store.GetBySlug(r.Context(), slug, false)
	if err != nil {
		jsonError(w, "Internal error", http.StatusInternalServerError)
		return
	}
	if item == nil {
		jsonError(w, "Not found", http.StatusNotFound)
		return
	}
	respondJSON(w, item)
}

// --- Admin endpoints ---

func (h *ItemHandler) AdminList(w http.ResponseWriter, r *http.Request) {
	f := parseFilters(r, true)
	items, err := h.store.List(r.Context(), f)
	if err != nil {
		jsonError(w, "Internal error", http.StatusInternalServerError)
		return
	}
	respondJSON(w, map[string]any{"items": items})
}

func (h *ItemHandler) AdminGet(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	item, err := h.store.GetByID(r.Context(), id)
	if err != nil {
		jsonError(w, "Internal error", http.StatusInternalServerError)
		return
	}
	if item == nil {
		jsonError(w, "Not found", http.StatusNotFound)
		return
	}
	respondJSON(w, item)
}

func (h *ItemHandler) AdminCreate(w http.ResponseWriter, r *http.Request) {
	var input models.CreateItemInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		jsonError(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	if strings.TrimSpace(input.Title) == "" {
		jsonError(w, "title is required", http.StatusBadRequest)
		return
	}

	item, err := h.store.Create(r.Context(), input)
	if err != nil {
		jsonError(w, "Internal error", http.StatusInternalServerError)
		return
	}

	h.revalidate()
	w.WriteHeader(http.StatusCreated)
	respondJSON(w, item)
}

func (h *ItemHandler) AdminUpdate(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var input models.UpdateItemInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		jsonError(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	if strings.TrimSpace(input.Title) == "" {
		jsonError(w, "title is required", http.StatusBadRequest)
		return
	}

	item, err := h.store.Update(r.Context(), id, input)
	if err != nil {
		jsonError(w, "Internal error", http.StatusInternalServerError)
		return
	}
	if item == nil {
		jsonError(w, "Not found", http.StatusNotFound)
		return
	}

	h.revalidate()
	respondJSON(w, item)
}

func (h *ItemHandler) AdminDelete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.store.Delete(r.Context(), id); err != nil {
		jsonError(w, "Internal error", http.StatusInternalServerError)
		return
	}
	h.revalidate()
	respondJSON(w, map[string]bool{"ok": true})
}

// --- helpers ---

func parseFilters(r *http.Request, adminMode bool) models.ListFilters {
	q := r.URL.Query()
	f := models.ListFilters{AdminMode: adminMode}

	f.Status = q.Get("status")
	if si := q.Get("statusIn"); si != "" {
		f.StatusIn = strings.Split(si, ",")
	}
	if fv := q.Get("featured"); fv == "true" {
		t := true
		f.Featured = &t
	}
	f.Category = q.Get("category")
	f.Type = q.Get("type")
	if qm := q.Get("quantityMin"); qm != "" {
		if n, err := strconv.Atoi(qm); err == nil {
			f.QuantityMin = &n
		}
	}
	if l := q.Get("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil {
			f.Limit = n
		}
	}
	return f
}

func respondJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}
