# Deploy Frontend — Vercel

Deploy the Admin UI (`admin/`) to Vercel.

**Prerequisites**: your API must be deployed and reachable at `https://api.your-domain.com` before you set the environment variable.

---

## Prerequisites

- A [Vercel account](https://vercel.com/) — the free tier is sufficient
- Vercel CLI:
  ```bash
  npm i -g vercel
  ```

---

## Deploy

```bash
cd admin
vercel --prod
```

When prompted the first time:
- **Set up and deploy?** Yes
- **Link to existing project?** No
- **Project name**: `simple-cms-admin` (or any name you prefer)
- **Which directory is your code?** `./` (you are already in `admin/`)

Vercel will build and deploy. Note the deployment URL (e.g. `simple-cms-admin.vercel.app`).

---

## Set the API URL Environment Variable

After the first deploy, tell the Admin UI where your API lives:

```bash
vercel env add NEXT_PUBLIC_API_URL production
# Enter value: https://api.your-domain.com

# Redeploy to pick up the new env var
vercel --prod
```

Alternatively, set it in the Vercel dashboard: **Project → Settings → Environment Variables**.

---

## Connect GitHub for Automatic Deploys

After the initial CLI deploy, wire up automatic deploys from GitHub:

1. Go to the [Vercel dashboard](https://vercel.com/) → your project → **Settings → Git**
2. Click **Connect Git Repository** → select GitHub → choose your `simple-cms` repo
3. Set **Root Directory** to `admin`
4. Save

Every push to `main` will now trigger a new deployment automatically.

---

## Add a Custom Domain

1. In the Vercel dashboard: **Project → Settings → Domains → Add** `admin.your-domain.com`
2. Vercel will display a CNAME record to add at your DNS provider — copy the value
3. Add the DNS record (see [DNS_SETUP.md](DNS_SETUP.md))
4. Once DNS propagates, Vercel issues a TLS certificate automatically

---

## Update CORS

Once your admin domain is live, update `ALLOWED_ORIGINS` in `/etc/simplecms/config.env` on your Lightsail server to include it:

```env
ALLOWED_ORIGINS=http://localhost:3001,https://admin.your-domain.com
```

Then restart the containers:

```bash
ssh -i ~/.ssh/simple-cms-key.pem ec2-user@YOUR_LIGHTSAIL_IP
cd ~/Simple-CMS
docker compose up -d
```
