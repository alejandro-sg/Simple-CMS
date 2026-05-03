package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"

	"github.com/alejandro-sg/Simple-CMS/api/internal/store"
)

const (
	siteContentKey      = "site_content"
	siteContentDraftKey = "site_content_draft"
)

// SiteContentHandler serves and manages the site content JSON blob.
//
// Two settings keys are used:
//   - "site_content"       — published, served to the public website
//   - "site_content_draft" — draft, served to the admin UI and preview mode
type SiteContentHandler struct {
	settings      *store.SettingsStore
	revalidate    func()
	previewSecret string
	websiteURL    string
}

func NewSiteContentHandler(settings *store.SettingsStore, revalidate func(), previewSecret, websiteURL string) *SiteContentHandler {
	return &SiteContentHandler{
		settings:      settings,
		revalidate:    revalidate,
		previewSecret: previewSecret,
		websiteURL:    websiteURL,
	}
}

// Get handles GET /api/site-content — public, returns published content.
func (h *SiteContentHandler) Get(w http.ResponseWriter, r *http.Request) {
	val, err := h.settings.Get(r.Context(), siteContentKey)
	if err != nil || val == "" {
		jsonError(w, "Site content not found", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(val)) //nolint:errcheck
}

// GetPreview handles GET /api/site-content/preview?secret=... — secret-gated, returns draft.
// Called by the website server when Next.js draft mode is active.
func (h *SiteContentHandler) GetPreview(w http.ResponseWriter, r *http.Request) {
	if h.previewSecret == "" || r.URL.Query().Get("secret") != h.previewSecret {
		http.Error(w, `{"error":"Unauthorized"}`, http.StatusUnauthorized)
		return
	}
	val, _ := h.settings.Get(r.Context(), siteContentDraftKey)
	if val == "" {
		// No draft yet — fall back to published
		val, _ = h.settings.Get(r.Context(), siteContentKey)
	}
	if val == "" {
		jsonError(w, "Site content not found", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(val)) //nolint:errcheck
}

// GetDraft handles GET /api/admin/site-content/draft — auth + content:write.
// Returns draft for the admin editor. If no draft exists, falls back to published.
func (h *SiteContentHandler) GetDraft(w http.ResponseWriter, r *http.Request) {
	val, _ := h.settings.Get(r.Context(), siteContentDraftKey)
	if val == "" {
		val, _ = h.settings.Get(r.Context(), siteContentKey)
	}
	if val == "" {
		jsonError(w, "Site content not found", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(val)) //nolint:errcheck
}

// SaveDraft handles PUT /api/admin/site-content/draft — auth + content:write.
// Saves to draft only; does NOT touch the published content or trigger revalidation.
func (h *SiteContentHandler) SaveDraft(w http.ResponseWriter, r *http.Request) {
	var raw json.RawMessage
	if err := json.NewDecoder(r.Body).Decode(&raw); err != nil {
		jsonError(w, "Invalid JSON", http.StatusBadRequest)
		return
	}
	normalized, err := json.Marshal(raw)
	if err != nil {
		jsonError(w, "Invalid JSON", http.StatusBadRequest)
		return
	}
	if err := h.settings.Set(r.Context(), siteContentDraftKey, string(normalized)); err != nil {
		jsonError(w, "Internal error", http.StatusInternalServerError)
		return
	}
	respondJSON(w, map[string]bool{"ok": true})
}

// PreviewRedirect handles GET /api/admin/site-content/preview-redirect — auth + content:write.
// Redirects to the website's preview-enable URL, embedding the preview secret server-side
// so the admin client never needs to know it.
func (h *SiteContentHandler) PreviewRedirect(w http.ResponseWriter, r *http.Request) {
	if h.previewSecret == "" || h.websiteURL == "" {
		jsonError(w, "Preview not configured (set PREVIEW_SECRET and WEBSITE_URL)", http.StatusServiceUnavailable)
		return
	}
	previewURL := fmt.Sprintf(
		"%s/api/preview?secret=%s&path=/",
		h.websiteURL,
		url.QueryEscape(h.previewSecret),
	)
	http.Redirect(w, r, previewURL, http.StatusFound)
}

// Publish handles POST /api/admin/site-content/publish — auth + content:write.
// Copies draft → published and triggers Next.js ISR revalidation.
func (h *SiteContentHandler) Publish(w http.ResponseWriter, r *http.Request) {
	draft, err := h.settings.Get(r.Context(), siteContentDraftKey)
	if err != nil || draft == "" {
		jsonError(w, "No draft to publish", http.StatusBadRequest)
		return
	}
	if err := h.settings.Set(r.Context(), siteContentKey, draft); err != nil {
		jsonError(w, "Internal error", http.StatusInternalServerError)
		return
	}
	h.revalidate()
	respondJSON(w, map[string]bool{"ok": true})
}
