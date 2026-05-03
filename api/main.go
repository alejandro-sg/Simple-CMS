package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/joho/godotenv"

	"github.com/alejandro-sg/Simple-CMS/api/internal/config"
	"github.com/alejandro-sg/Simple-CMS/api/internal/db"
	"github.com/alejandro-sg/Simple-CMS/api/internal/handlers"
	"github.com/alejandro-sg/Simple-CMS/api/internal/middleware"
	"github.com/alejandro-sg/Simple-CMS/api/internal/models"
	s3client "github.com/alejandro-sg/Simple-CMS/api/internal/s3"
	"github.com/alejandro-sg/Simple-CMS/api/internal/sessions"
	"github.com/alejandro-sg/Simple-CMS/api/internal/store"
)

func main() {
	// Load .env if present (dev only — production uses real env vars)
	godotenv.Load()

	cfg := config.Load()

	database, err := db.Open(cfg.DBPath)
	if err != nil {
		log.Fatalf("open database: %v", err)
	}
	defer database.Close()

	sessionStore := sessions.NewStore(database)
	itemStore := store.NewItemStore(database)
	settingsStore := store.NewSettingsStore(database)
	reviewsStore := store.NewReviewsStore(database)
	usersStore := store.NewUsersStore(database)

	var s3 *s3client.Client
	if cfg.S3Bucket != "" {
		s3, err = s3client.NewClient(cfg.S3Bucket, cfg.S3Region, cfg.AWSAccessKeyID, cfg.AWSSecretAccessKey)
		if err != nil {
			log.Fatalf("init s3 client: %v", err)
		}
	}

	// Seed initial admin user if no users exist.
	count, err := usersStore.Count(context.Background())
	if err != nil {
		log.Fatalf("count users: %v", err)
	}
	if count == 0 && cfg.AdminUsername != "" && cfg.AdminPasswordHash != "" {
		_, err := usersStore.Create(context.Background(), models.CreateUserInput{
			Username:    cfg.AdminUsername,
			Role:        models.RoleAdmin,
			Permissions: []string{},
		}, cfg.AdminPasswordHash)
		if err != nil {
			log.Fatalf("seed admin: %v", err)
		}
		// Migrate existing TOTP secret from settings table to the new user record.
		existingTOTP, _ := settingsStore.Get(context.Background(), "totp_secret")
		if existingTOTP != "" {
			admin, _, _ := usersStore.GetByUsername(context.Background(), cfg.AdminUsername)
			if admin != nil {
				usersStore.SetTOTPSecret(context.Background(), admin.ID, existingTOTP)
			}
		}
		log.Printf("admin user %q created", cfg.AdminUsername)
	}

	// Seed default site content on first run (both published and draft).
	if existing, _ := settingsStore.Get(context.Background(), "site_content"); existing == "" {
		if b, err := json.Marshal(handlers.DefaultSiteContent()); err == nil {
			blob := string(b)
			if err := settingsStore.Set(context.Background(), "site_content", blob); err != nil {
				log.Printf("seed site_content: %v", err)
			}
			if err := settingsStore.Set(context.Background(), "site_content_draft", blob); err != nil {
				log.Printf("seed site_content_draft: %v", err)
			}
			log.Printf("site_content seeded with defaults")
		}
	}

	// Purge expired sessions once an hour.
	go func() {
		t := time.NewTicker(time.Hour)
		defer t.Stop()
		for range t.C {
			if err := sessionStore.Cleanup(context.Background()); err != nil {
				log.Printf("session cleanup: %v", err)
			}
		}
	}()

	revalidate := handlers.TriggerRevalidation(cfg)

	authHandler := handlers.NewAuthHandler(cfg, sessionStore, settingsStore, usersStore)
	itemHandler := handlers.NewItemHandler(itemStore, revalidate)
	bulkHandler := handlers.NewBulkHandler(itemStore, revalidate)
	totpHandler := handlers.NewTOTPHandler(settingsStore, usersStore)
	reviewsHandler := handlers.NewReviewsHandler(reviewsStore)
	usersHandler := handlers.NewUsersHandler(usersStore)
	siteContentHandler := handlers.NewSiteContentHandler(settingsStore, revalidate, cfg.PreviewSecret, cfg.WebsiteURL)

	var uploadHandler *handlers.UploadHandler
	if s3 != nil {
		uploadHandler = handlers.NewUploadHandler(s3)
	}

	requireAuth := middleware.RequireAuth(sessionStore, usersStore)
	requireAdmin := middleware.RequireAdmin()

	r := chi.NewRouter()
	r.Use(chimiddleware.RealIP)
	r.Use(chimiddleware.Logger)
	r.Use(chimiddleware.Recoverer)
	r.Use(middleware.CORS(cfg.AllowedOrigins))

	r.Route("/api", func(r chi.Router) {
		// Auth
		r.With(middleware.RateLimitLogin).Post("/auth/login", authHandler.Login)
		r.With(requireAuth).Post("/auth/logout", authHandler.Logout)
		r.With(requireAuth).Get("/auth/me", authHandler.Me)

		// TOTP — status is public, all others require auth
		r.Get("/auth/totp/status", totpHandler.Status)
		r.With(requireAuth).Get("/auth/totp/setup", totpHandler.Setup)
		r.With(requireAuth).Post("/auth/totp/confirm", totpHandler.Confirm)
		r.With(requireAuth).Post("/auth/totp/disable", totpHandler.Disable)

		// Public reviews
		r.With(middleware.RateLimitReviews).Post("/reviews", reviewsHandler.Submit)
		r.Get("/reviews", reviewsHandler.ListApproved)

		// Public items
		r.Get("/items", itemHandler.ListPublic)
		r.Get("/items/{slug}", itemHandler.GetPublicBySlug)

		// Public site content
		r.Get("/site-content", siteContentHandler.Get)
		r.Get("/site-content/preview", siteContentHandler.GetPreview) // secret-gated, no session cookie needed

		// Admin routes — all require auth
		r.Group(func(r chi.Router) {
			r.Use(requireAuth)

			// Items — per-action permission checks
			r.With(middleware.RequirePermission(models.PermItemsRead)).Get("/admin/items", itemHandler.AdminList)
			r.With(middleware.RequirePermission(models.PermItemsRead)).Get("/admin/items/{id}", itemHandler.AdminGet)
			r.With(middleware.RequirePermission(models.PermItemsWrite)).Post("/admin/items", itemHandler.AdminCreate)
			r.With(middleware.RequirePermission(models.PermItemsWrite)).Put("/admin/items/{id}", itemHandler.AdminUpdate)
			r.With(middleware.RequirePermission(models.PermItemsDelete)).Delete("/admin/items/{id}", itemHandler.AdminDelete)

			// Upload — inventory images (uploads:write)
			if uploadHandler != nil {
				r.With(middleware.RequirePermission(models.PermUploadsWrite)).Post("/admin/upload", uploadHandler.Upload)
			} else {
				r.Post("/admin/upload", func(w http.ResponseWriter, r *http.Request) {
					http.Error(w, `{"error":"S3 not configured"}`, http.StatusServiceUnavailable)
				})
			}

			// Upload — site images (content:write)
			if uploadHandler != nil {
				r.With(middleware.RequirePermission(models.PermContentWrite)).Post("/admin/upload/site", uploadHandler.UploadSite)
			} else {
				r.Post("/admin/upload/site", func(w http.ResponseWriter, r *http.Request) {
					http.Error(w, `{"error":"S3 not configured"}`, http.StatusServiceUnavailable)
				})
			}

			// Bulk CSV
			r.With(middleware.RequirePermission(models.PermItemsRead)).Get("/admin/items/template", bulkHandler.Template)
			r.With(middleware.RequirePermission(models.PermItemsImport)).Post("/admin/items/import", bulkHandler.Import)

			// Reviews moderation
			r.With(middleware.RequirePermission(models.PermReviewsRead)).Get("/admin/reviews", reviewsHandler.AdminList)
			r.With(middleware.RequirePermission(models.PermReviewsModerate)).Put("/admin/reviews/{id}", reviewsHandler.AdminUpdateStatus)
			r.With(middleware.RequirePermission(models.PermReviewsDelete)).Delete("/admin/reviews/{id}", reviewsHandler.AdminDelete)

			// Site content management
			r.With(middleware.RequirePermission(models.PermContentWrite)).Get("/admin/site-content/draft", siteContentHandler.GetDraft)
			r.With(middleware.RequirePermission(models.PermContentWrite)).Put("/admin/site-content/draft", siteContentHandler.SaveDraft)
			r.With(middleware.RequirePermission(models.PermContentWrite)).Post("/admin/site-content/publish", siteContentHandler.Publish)
			r.With(middleware.RequirePermission(models.PermContentWrite)).Get("/admin/site-content/preview-redirect", siteContentHandler.PreviewRedirect)

			// User management — admin only
			r.With(requireAdmin).Get("/admin/users", usersHandler.List)
			r.With(requireAdmin).Post("/admin/users", usersHandler.Create)
			r.With(requireAdmin).Get("/admin/users/permissions", usersHandler.Permissions)
			r.With(requireAdmin).Patch("/admin/users/{id}", usersHandler.Update)
			r.With(requireAdmin).Delete("/admin/users/{id}", usersHandler.Delete)
		})
	})

	// Health check
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, `{"ok":true}`)
	})

	addr := ":" + cfg.Port
	log.Printf("Simple-CMS API listening on %s", addr)
	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatalf("server: %v", err)
	}

	_ = os.Getenv // suppress unused import if godotenv is missing
}
