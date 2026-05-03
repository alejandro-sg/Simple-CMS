package config

import (
	"log"
	"os"
	"strconv"
	"strings"

	"github.com/your-username/simple-cms/api/internal/secrets"
)

type Config struct {
	Port               string
	DBPath             string
	AdminUsername      string
	AdminPasswordHash  string
	SessionSecret      string
	SessionTTLHours    int
	S3Bucket           string
	S3Region           string
	AWSAccessKeyID     string
	AWSSecretAccessKey string
	RevalidateURL      string
	RevalidateSecret   string
	AllowedOrigins     []string
	PreviewSecret      string
	WebsiteURL         string
}

func Load() *Config {
	ttl := 72
	if v := os.Getenv("SESSION_TTL_HOURS"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			ttl = n
		}
	}

	origins := []string{}
	if v := os.Getenv("ALLOWED_ORIGINS"); v != "" {
		for _, o := range strings.Split(v, ",") {
			o = strings.TrimSpace(o)
			if o != "" {
				origins = append(origins, o)
			}
		}
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	cfg := &Config{
		Port:               port,
		DBPath:             getEnv("CMS_DB_PATH", "./cms.db"),
		AdminUsername:      os.Getenv("ADMIN_USERNAME"),
		AdminPasswordHash:  os.Getenv("ADMIN_PASSWORD_HASH"),
		SessionSecret:      os.Getenv("SESSION_SECRET"),
		SessionTTLHours:    ttl,
		S3Bucket:           os.Getenv("S3_BUCKET"),
		S3Region:           getEnv("S3_REGION", "us-east-1"),
		AWSAccessKeyID:     os.Getenv("AWS_ACCESS_KEY_ID"),
		AWSSecretAccessKey: os.Getenv("AWS_SECRET_ACCESS_KEY"),
		RevalidateURL:      os.Getenv("REVALIDATE_URL"),
		RevalidateSecret:   os.Getenv("REVALIDATE_SECRET"),
		AllowedOrigins:     origins,
		PreviewSecret:      os.Getenv("PREVIEW_SECRET"),
		WebsiteURL:         os.Getenv("WEBSITE_URL"),
	}

	// In production, override sensitive values from AWS Secrets Manager.
	// Set AWS_SECRET_NAME in the server config to enable this.
	if name := os.Getenv("AWS_SECRET_NAME"); name != "" {
		sv, err := secrets.Load(name, cfg.S3Region, cfg.AWSAccessKeyID, cfg.AWSSecretAccessKey)
		if err != nil {
			log.Fatalf("secrets manager: %v", err)
		}
		cfg.AdminPasswordHash = sv.AdminPasswordHash
		cfg.SessionSecret = sv.SessionSecret
		cfg.RevalidateSecret = sv.RevalidateSecret
		log.Printf("secrets loaded from AWS Secrets Manager (%s)", name)
	}

	return cfg
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
