package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/your-username/simple-cms/api/internal/imaging"
	s3client "github.com/your-username/simple-cms/api/internal/s3"
	"github.com/your-username/simple-cms/api/internal/store"
)

const maxUploadSize = 30 << 20 // 30 MB

type UploadHandler struct {
	s3 *s3client.Client
}

func NewUploadHandler(s3 *s3client.Client) *UploadHandler {
	return &UploadHandler{s3: s3}
}

// UploadSite handles POST /api/admin/upload/site — auth + content:write.
// PNG files (e.g. logos) are preserved as PNG; all others are compressed to JPEG.
// Files are stored under the "site/" S3 prefix.
func (h *UploadHandler) UploadSite(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(maxUploadSize); err != nil {
		jsonError(w, "File too large or invalid form", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("image")
	if err != nil {
		jsonError(w, "Missing image field", http.StatusBadRequest)
		return
	}
	defer file.Close()

	ct := header.Header.Get("Content-Type")
	if !isSupportedImage(ct) {
		ext := strings.ToLower(filepath.Ext(header.Filename))
		if !isSupportedExtension(ext) {
			jsonError(w, "Unsupported image type. Use JPEG, PNG, WebP, or GIF.", http.StatusBadRequest)
			return
		}
	}

	isPNG := strings.EqualFold(ct, "image/png") ||
		strings.ToLower(filepath.Ext(header.Filename)) == ".png"

	id, err := randomID()
	if err != nil {
		jsonError(w, "Internal error", http.StatusInternalServerError)
		return
	}

	var (
		data        []byte
		ext         string
		contentType string
	)

	if isPNG {
		data, err = imaging.CompressPNG(file)
		ext = ".png"
		contentType = "image/png"
	} else {
		data, err = imaging.Compress(file)
		ext = ".jpg"
		contentType = "image/jpeg"
	}
	if err != nil {
		jsonError(w, "Failed to process image", http.StatusUnprocessableEntity)
		return
	}

	filename := sanitizeFilename(header.Filename)
	key := fmt.Sprintf("site/%s/%s%s", id, filename, ext)
	publicURL, err := h.s3.Put(r.Context(), key, data, contentType)
	if err != nil {
		jsonError(w, "Failed to upload image", http.StatusInternalServerError)
		return
	}

	respondJSON(w, map[string]string{"publicUrl": publicURL})
}

func (h *UploadHandler) Upload(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(maxUploadSize); err != nil {
		jsonError(w, "File too large or invalid form", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("image")
	if err != nil {
		jsonError(w, "Missing image field", http.StatusBadRequest)
		return
	}
	defer file.Close()

	ct := header.Header.Get("Content-Type")
	if !isSupportedImage(ct) {
		ext := strings.ToLower(filepath.Ext(header.Filename))
		if !isSupportedExtension(ext) {
			jsonError(w, "Unsupported image type. Use JPEG, PNG, WebP, or GIF.", http.StatusBadRequest)
			return
		}
	}

	compressed, err := imaging.Compress(file)
	if err != nil {
		jsonError(w, "Failed to process image", http.StatusUnprocessableEntity)
		return
	}

	// Build a descriptive folder name: images/<item-name>-<random-id>/
	// The item name comes from the optional "itemName" form field.
	itemName := strings.TrimSpace(r.FormValue("itemName"))
	folderName, err := itemFolderName(itemName)
	if err != nil {
		jsonError(w, "Internal error", http.StatusInternalServerError)
		return
	}

	key := fmt.Sprintf("images/%s/%s.jpg", folderName, sanitizeFilename(header.Filename))
	publicURL, err := h.s3.Put(r.Context(), key, compressed, "image/jpeg")
	if err != nil {
		jsonError(w, "Failed to upload image", http.StatusInternalServerError)
		return
	}

	respondJSON(w, map[string]string{"publicUrl": publicURL})
}

// itemFolderName returns "<slugified-name>-<random-id>".
// If no name is provided it falls back to "item-<random-id>".
func itemFolderName(name string) (string, error) {
	slug := store.Slugify(name)
	if slug == "" || slug == "item" {
		slug = "item"
	}
	id, err := randomID()
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%s-%s", slug, id), nil
}

func isSupportedImage(ct string) bool {
	supported := []string{"image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"}
	for _, s := range supported {
		if strings.EqualFold(ct, s) {
			return true
		}
	}
	return false
}

func isSupportedExtension(ext string) bool {
	supported := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".webp": true, ".gif": true, ".heic": true, ".heif": true}
	return supported[ext]
}

func sanitizeFilename(name string) string {
	base := strings.TrimSuffix(name, filepath.Ext(name))
	re := strings.NewReplacer(" ", "-", "_", "-")
	base = re.Replace(strings.ToLower(base))
	safe := strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' {
			return r
		}
		return -1
	}, base)
	if safe == "" {
		safe = "image"
	}
	return safe
}

func randomID() (string, error) {
	b := make([]byte, 6)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("crypto/rand: %w", err)
	}
	return hex.EncodeToString(b), nil
}
