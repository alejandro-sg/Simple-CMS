# AWS Setup

One-time setup of all AWS resources needed to run Simple-CMS in production.

All resources should be created in the same region (recommended: **us-east-1**).

---

## Section 1: S3 Bucket

1. Go to the [S3 console](https://s3.console.aws.amazon.com/s3/) and click **Create bucket**.

2. **Bucket name**: choose any globally unique name (e.g. `your-cms-images`). Note this name — you will set it as `S3_BUCKET` in your server config.

3. **AWS Region**: `us-east-1` (or your preferred region — update `S3_REGION` to match).

4. **Block Public Access settings**: uncheck **Block all public access**. Item images must be publicly readable. Acknowledge the warning.

5. Create the bucket, then go to the bucket → **Permissions** → **Bucket policy** and paste:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-cms-images/images/*"
    }
  ]
}
```

Replace `your-cms-images` with your actual bucket name. This allows public read only on the `images/` prefix.

---

## Section 2: IAM User

1. Go to [IAM → Users](https://console.aws.amazon.com/iam/home#/users) and click **Create user**.

2. **User name**: `simple-cms-api`

3. On the permissions step, choose **Attach policies directly** → click **Create inline policy** and paste this JSON:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::your-cms-images/*"
    },
    {
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::your-cms-images"
    },
    {
      "Effect": "Allow",
      "Action": "secretsmanager:GetSecretValue",
      "Resource": "arn:aws:secretsmanager:us-east-1:*:secret:simple-cms/*"
    }
  ]
}
```

Replace `your-cms-images` with your bucket name.

4. After creating the user, go to the user → **Security credentials** → **Create access key**.
   - Use case: **Application running outside AWS**
   - Click through and **download or copy the Key ID and Secret** — the secret is only shown once.

---

## Section 3: Lightsail Instance

1. Go to [Lightsail](https://lightsail.aws.amazon.com/) and click **Create instance**.

2. **Platform**: Linux/Unix
   **Blueprint**: OS Only → **Amazon Linux 2023**

3. **Instance plan**: $7/month (2 GB RAM, 1 vCPU, 60 GB SSD)

4. **Instance name**: `simple-cms-api`

5. Click **Create instance** and wait for the status to change to **Running** (about 1 minute).

6. Attach a static IP so your domain record stays stable:
   - Go to the **Networking** tab → **Create static IP**
   - Attach it to your `simple-cms-api` instance
   - Note the IP address — you will use it for your DNS A record

7. Open the required ports in the Lightsail firewall:
   - Go to the instance → **Networking** → **IPv4 Firewall**
   - Add rules: **TCP 22** (SSH), **TCP 80** (HTTP), **TCP 443** (HTTPS)

8. Download or create an SSH key pair:
   - Go to **Account** → **SSH keys** → download the default key, or create a new one
   - Save it as `~/.ssh/simple-cms-key.pem` and restrict permissions: `chmod 600 ~/.ssh/simple-cms-key.pem`

---

## Section 4: AWS Secrets Manager (optional but recommended for production)

Secrets Manager lets you store sensitive config values outside your server config file and rotate them without SSHing in.

1. Go to [Secrets Manager](https://console.aws.amazon.com/secretsmanager/) and click **Store a new secret**.

2. **Secret type**: Other type of secret

3. **Key/value pairs** — add these three:

   | Key | Value |
   |-----|-------|
   | `AdminPasswordHash` | bcrypt hash of your admin password |
   | `SessionSecret` | 32-byte hex string (`openssl rand -hex 32`) |
   | `RevalidateSecret` | 32-byte hex string (for ISR webhook — leave blank if you have no public site) |

4. **Secret name**: `simple-cms/api`

5. Leave rotation disabled for now (IAM key rotation is handled separately — see [IAM_KEY_ROTATION.md](IAM_KEY_ROTATION.md)).

6. In your server config, set `AWS_SECRET_NAME=simple-cms/api` to enable. The API fetches these values at startup and they override anything set in the config file.

---

## Next Step

With AWS resources in place, proceed to [DEPLOY_BACKEND.md](DEPLOY_BACKEND.md) to set up your Lightsail server and deploy the API.
