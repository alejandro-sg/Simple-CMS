package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/alejandro-sg/Simple-CMS/api/internal/models"
	"github.com/alejandro-sg/Simple-CMS/api/internal/store"
)

type ReviewsHandler struct {
	store *store.ReviewsStore
}

func NewReviewsHandler(s *store.ReviewsStore) *ReviewsHandler {
	return &ReviewsHandler{store: s}
}

// Submit — public: POST /api/reviews
func (h *ReviewsHandler) Submit(w http.ResponseWriter, r *http.Request) {
	var in models.CreateReviewInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		jsonError(w, "Invalid request", http.StatusBadRequest)
		return
	}
	if in.Rating < 1 || in.Rating > 5 {
		jsonError(w, "rating must be between 1 and 5", http.StatusBadRequest)
		return
	}
	if in.Name == "" {
		jsonError(w, "name is required", http.StatusBadRequest)
		return
	}
	if len(in.Name) > 100 {
		jsonError(w, "name must be 100 characters or fewer", http.StatusBadRequest)
		return
	}
	if len(in.Feedback) > 2000 {
		jsonError(w, "feedback must be 2000 characters or fewer", http.StatusBadRequest)
		return
	}
	validTypes := map[string]bool{
		"Product Review": true, "Service Review": true, "Customer Feedback": true,
	}
	if !validTypes[in.Type] {
		jsonError(w, "invalid type", http.StatusBadRequest)
		return
	}

	review, err := h.store.Create(r.Context(), in)
	if err != nil {
		jsonError(w, "Internal error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(review)
}

// ListApproved — public: GET /api/reviews
func (h *ReviewsHandler) ListApproved(w http.ResponseWriter, r *http.Request) {
	reviews, err := h.store.ListApproved(r.Context())
	if err != nil {
		jsonError(w, "Internal error", http.StatusInternalServerError)
		return
	}
	respondJSON(w, map[string]any{"reviews": reviews})
}

// AdminList — admin: GET /api/admin/reviews
func (h *ReviewsHandler) AdminList(w http.ResponseWriter, r *http.Request) {
	reviews, err := h.store.ListAll(r.Context())
	if err != nil {
		jsonError(w, "Internal error", http.StatusInternalServerError)
		return
	}
	respondJSON(w, map[string]any{"reviews": reviews})
}

// AdminUpdateStatus — admin: PUT /api/admin/reviews/{id}
func (h *ReviewsHandler) AdminUpdateStatus(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var body struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "Invalid request", http.StatusBadRequest)
		return
	}
	validStatuses := map[string]bool{"New": true, "Approved": true, "Rejected": true, "Archived": true}
	if !validStatuses[body.Status] {
		jsonError(w, "status must be New, Approved, Rejected, or Archived", http.StatusBadRequest)
		return
	}

	review, err := h.store.UpdateStatus(r.Context(), id, body.Status)
	if err != nil {
		jsonError(w, "Internal error", http.StatusInternalServerError)
		return
	}
	if review == nil {
		jsonError(w, "Not found", http.StatusNotFound)
		return
	}
	respondJSON(w, review)
}

// AdminDelete — admin: DELETE /api/admin/reviews/{id}
func (h *ReviewsHandler) AdminDelete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.store.Delete(r.Context(), id); err != nil {
		jsonError(w, "Internal error", http.StatusInternalServerError)
		return
	}
	respondJSON(w, map[string]bool{"ok": true})
}
