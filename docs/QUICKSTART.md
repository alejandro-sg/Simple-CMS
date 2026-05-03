# Quick Start — Local Setup (5 minutes)

Get the full stack running locally with no AWS account required.

---

## Prerequisites

- **Go 1.21+** — [golang.org/dl](https://golang.org/dl/)
- **Node.js 18+** — [nodejs.org](https://nodejs.org/)

---

## Steps

### 1. Clone the repo

```bash
git clone https://github.com/your-username/simple-cms.git
cd simple-cms
```

### 2. Generate a bcrypt password hash for your admin account

```bash
htpasswd -bnBC 10 "" yourpassword | tr -d ':\n'
```

If `htpasswd` is not installed, use Docker instead:

```bash
docker run --rm httpd:2 htpasswd -bnBC 10 "" yourpassword | tr -d ':\n'
```

Copy the output — it will look like `$2y$10$...`. You'll need it in the next step.

### 3. Create `api/.env`

Copy the example file:

```bash
cp api/.env.example api/.env
```

Then open `api/.env` and set these values:

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=<hash from step 2>
SESSION_SECRET=<run: openssl rand -hex 32>
S3_BUCKET=
ALLOWED_ORIGINS=http://localhost:3001
```

- Leave `S3_BUCKET=` **empty** — this disables image uploads (expected for local dev)
- Generate the session secret with: `openssl rand -hex 32`

### 4. Start the Go API

```bash
cd api
go run .
```

The API starts on port **8080**. On first run it creates `cms.db` and seeds the admin user and default site content.

### 5. Create `admin/.env.local`

In a new terminal:

```bash
echo "NEXT_PUBLIC_API_URL=http://localhost:8080" > admin/.env.local
```

### 6. Start the Admin UI

```bash
cd admin
npm install
npm run dev
```

The Admin UI starts on port **3001** (configured in `package.json` to avoid conflicts).

### 7. Log in

Open [http://localhost:3001](http://localhost:3001) and log in with the username and password you chose in step 2.

---

## What you can do

- **Items** — create, edit, publish, and delete items
- **Reviews** — moderate submitted reviews (approve / reject)
- **Site Content** — edit public-facing text (brand name, copy, contact info)

---

## Website (optional)

The `website/` directory contains a public Next.js website that reads from the API.

```bash
cd website
npm install
cp .env.local.example .env.local
# Set API_URL=http://localhost:8080 (already set in example)
npm run dev  # starts on :3000
```

Open http://localhost:3000 to see the public-facing site.

---

## Next steps

- **Full dev guide** (env vars, smoke tests, reset DB): [LOCAL_DEV.md](LOCAL_DEV.md)
- **Deploy to production** (AWS + Vercel): [AWS_SETUP.md](AWS_SETUP.md) → [DEPLOY_BACKEND.md](DEPLOY_BACKEND.md) → [DEPLOY_FRONTEND.md](DEPLOY_FRONTEND.md)
