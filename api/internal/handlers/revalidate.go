package handlers

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/alejandro-sg/Simple-CMS/api/internal/config"
)

// TriggerRevalidation calls the Next.js on-demand revalidation endpoint.
// It runs in a goroutine so writes are not blocked by Vercel latency.
func TriggerRevalidation(cfg *config.Config) func() {
	return func() {
		if cfg.RevalidateURL == "" || cfg.RevalidateSecret == "" {
			return
		}
		go func() {
			ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
			defer cancel()
			url := fmt.Sprintf("%s?secret=%s", cfg.RevalidateURL, cfg.RevalidateSecret)
			req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
			if err != nil {
				return
			}
			resp, err := http.DefaultClient.Do(req)
			if err != nil {
				log.Printf("revalidation request failed: %v", err)
				return
			}
			if resp != nil {
				resp.Body.Close()
			}
		}()
	}
}
