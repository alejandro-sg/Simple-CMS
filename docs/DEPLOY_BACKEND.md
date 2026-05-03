# Deploy Backend — Lightsail

Step-by-step guide to deploying the Go API to your AWS Lightsail instance.

**Prerequisites**: complete [AWS_SETUP.md](AWS_SETUP.md) first.

---

## Section 1: First-Time Server Setup

SSH into your server and install the required software.

```bash
# SSH in (replace with your actual key path and IP)
ssh -i ~/.ssh/simple-cms-key.pem ec2-user@YOUR_LIGHTSAIL_IP

# Install Docker
sudo dnf install -y docker
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user
# Log out and back in for the docker group to take effect
exit
ssh -i ~/.ssh/simple-cms-key.pem ec2-user@YOUR_LIGHTSAIL_IP

# Install Docker Compose plugin
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# Verify
docker --version
docker compose version

# Clone the repo
cd ~
git clone https://github.com/your-username/simple-cms.git Simple-CMS
cd Simple-CMS
```

---

## Section 2: Create Server Config

Create the config file with your production values.

```bash
# Create config directory
sudo mkdir -p /etc/simplecms

sudo tee /etc/simplecms/config.env <<'EOF'
PORT=8080
CMS_DB_PATH=/var/lib/simplecms/cms.db
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=<your bcrypt hash>
SESSION_SECRET=<openssl rand -hex 32>
SESSION_TTL_HOURS=72
S3_BUCKET=your-cms-images
S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=<your key id>
AWS_SECRET_ACCESS_KEY=<your secret key>
REVALIDATE_URL=https://your-site.vercel.app/api/revalidate
REVALIDATE_SECRET=<openssl rand -hex 32>
ALLOWED_ORIGINS=https://admin.your-domain.com
AWS_SECRET_NAME=simple-cms/api
PREVIEW_SECRET=<openssl rand -hex 32>
WEBSITE_URL=https://your-domain.com
EOF

# Restrict access — this file contains secrets
sudo chmod 600 /etc/simplecms/config.env
```

**Notes:**
- Generate random secrets with `openssl rand -hex 32`
- If using Secrets Manager (`AWS_SECRET_NAME`), `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`, and `REVALIDATE_SECRET` are loaded from there at startup and override values in this file
- The SQLite database is persisted at `CMS_DB_PATH` inside a Docker volume

---

## Section 3: Build and Start

```bash
cd ~/Simple-CMS

# Build the API image
docker compose build api

# Start in detached mode
docker compose up -d

# Watch startup logs
docker compose logs -f

# Verify
curl http://localhost:8080/health
# → {"ok":true}
```

---

## Section 4: Systemd Service (Auto-Start on Reboot)

Set up a systemd unit so the containers restart automatically if the server reboots.

```bash
sudo tee /etc/systemd/system/simple-cms.service <<'EOF'
[Unit]
Description=Simple-CMS Docker Compose
Requires=docker.service
After=docker.service

[Service]
WorkingDirectory=/home/ec2-user/Simple-CMS
ExecStart=/usr/local/bin/docker compose up
ExecStop=/usr/local/bin/docker compose down
Restart=always
User=ec2-user

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable simple-cms
sudo systemctl start simple-cms
```

---

## Section 5: Deploying Updates

### Manual deploy

```bash
ssh -i ~/.ssh/simple-cms-key.pem ec2-user@YOUR_LIGHTSAIL_IP
cd ~/Simple-CMS
git pull
docker compose build api
docker compose up -d
```

### Automated deploy via GitHub Actions

The repo includes `.github/workflows/deploy-api.yml`. It triggers on any push to `main` that touches `api/`, `Caddyfile`, or `docker-compose.yml`.

Set these secrets in your GitHub repo (Settings → Secrets and variables → Actions):

| Secret | Value |
|--------|-------|
| `LIGHTSAIL_HOST` | Your Lightsail static IP |
| `LIGHTSAIL_USER` | `ec2-user` |
| `LIGHTSAIL_KEY` | Contents of your SSH private key (`cat ~/.ssh/simple-cms-key.pem`) |

After the secrets are set, every qualifying push to `main` will automatically build and deploy the API.

---

## Section 6: Verify Everything

```bash
# API health check
curl https://api.your-domain.com/health

# Public items endpoint
curl https://api.your-domain.com/api/items

# View API logs
docker compose logs -f api

# View Caddy logs
docker compose logs -f caddy
```

Caddy handles HTTPS automatically via Let's Encrypt once your DNS A record points to the server. See [DNS_SETUP.md](DNS_SETUP.md).

---

## Next Step

Deploy the Admin UI to Vercel: [DEPLOY_FRONTEND.md](DEPLOY_FRONTEND.md)
