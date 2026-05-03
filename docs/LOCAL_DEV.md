# Local Development Guide

Full guide for running and developing Simple-CMS locally.

---

## Prerequisites

- **Go 1.21+** — [golang.org/dl](https://golang.org/dl/)
- **Node.js 18+** — [nodejs.org](https://nodejs.org/)
- **gcc** (required by go-sqlite3 for CGO)
  - macOS: `xcode-select --install`
  - Linux: `sudo apt install build-essential` (Debian/Ubuntu) or `sudo dnf install gcc` (Amazon Linux)
- **SQLite CLI** (optional, for inspecting the database): `brew install sqlite` / `apt install sqlite3`

---

## Port Map

| Service | Port | URL |
|---------|------|-----|
| Go API | 8080 | http://localhost:8080 |
| Admin UI | 3001 | http://localhost:3001 |

---

## API Environment Variables

All variables are read from `api/.env` (or the environment). Copy `api/.env.example` to get started.

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Port the API listens on | No (default: `8080`) |
| `CMS_DB_PATH` | Path to the SQLite database file | No (default: `./cms.db`) |
| `ADMIN_USERNAME` | Username for the built-in admin account | Yes |
| `ADMIN_PASSWORD_HASH` | bcrypt hash of the admin password | Yes (or via Secrets Manager) |
| `SESSION_SECRET` | 32-byte hex string used to sign session cookies | Yes (or via Secrets Manager) |
| `SESSION_TTL_HOURS` | Session lifetime in hours | No (default: `72`) |
| `S3_BUCKET` | S3 bucket name for image uploads. Leave empty to disable uploads | No |
| `S3_REGION` | AWS region for the S3 bucket | No (default: `us-east-1`) |
| `AWS_ACCESS_KEY_ID` | AWS access key for S3 and Secrets Manager | No (uses instance role if blank) |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | No |
| `AWS_SECRET_NAME` | Secrets Manager secret name to load at startup | No |
| `ALLOWED_ORIGINS` | Comma-separated list of CORS origins | Yes |
| `REVALIDATE_URL` | Webhook URL to trigger ISR on your public site | No |
| `REVALIDATE_SECRET` | Shared secret for the revalidation webhook | No (or via Secrets Manager) |
| `PREVIEW_SECRET` | Secret for preview mode on your public site | No |
| `WEBSITE_URL` | Public website URL (used in emails / links) | No |

> **Never commit `api/.env`.** It is listed in `.gitignore`. In production, sensitive values are fetched from AWS Secrets Manager at startup.

---

## Starting the API

```bash
cd api

# Install dependencies (first time only)
go mod download

# Run
go run .
# → API listening on :8080
```

To build a binary instead:

```bash
go build -o cms-api .
./cms-api
```

If you have [`air`](https://github.com/air-verse/air) installed, it provides hot reload:

```bash
air
```

---

## Starting the Admin UI

```bash
cd admin

# Install dependencies (first time only)
npm install

# Start dev server on port 3001
npm run dev
# → open http://localhost:3001
```

`admin/.env.local` must contain:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

---

## Smoke Tests

```bash
# Health check
curl http://localhost:8080/health

# Login and save cookie
curl -c /tmp/cms.txt -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}'

# List items (admin — requires auth cookie)
curl -b /tmp/cms.txt http://localhost:8080/api/admin/items

# List items (public — no auth required)
curl http://localhost:8080/api/items
```

---

## Reset the Database

Deleting the database file causes the API to recreate the schema and re-seed the admin user and default site content on the next startup:

```bash
rm api/cms.db
# Then restart: go run .
```

---

## S3-Disabled Mode

Leave `S3_BUCKET=` empty in `api/.env`. Image upload requests will return `503 Service Unavailable` — this is expected and safe for local development.

---

## Module Path

The Go module path is `github.com/your-username/simple-cms/api`. If you fork this repo and publish it under your own GitHub account, update the module path:

1. In `api/go.mod`, change the `module` line to your actual path
2. Update all internal imports:
   ```bash
   find api/ -name "*.go" | xargs sed -i 's|github.com/your-username/simple-cms/api|github.com/YOUR_ORG/YOUR_REPO/api|g'
   ```
3. Verify: `go build ./...`
