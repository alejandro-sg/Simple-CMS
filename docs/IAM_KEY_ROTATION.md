# IAM Key Rotation

Automated monthly rotation of AWS IAM access keys via GitHub Actions.

---

## Why Rotate

AWS IAM access keys are long-lived credentials. Monthly rotation limits the exposure window if a key is ever compromised — an old key stops working within 30 days even if it leaks.

---

## How It Works

The `.github/workflows/rotate-iam-key.yml` workflow runs automatically on the **1st of each month** and can also be triggered manually via `workflow_dispatch`.

It performs these steps:

1. Creates a **new** access key for the `simple-cms-api` IAM user
2. SSHes into your Lightsail server
3. Updates `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in `/etc/simplecms/config.env`
4. Restarts the Docker containers to pick up the new credentials
5. **Deletes the old access key**

---

## Required GitHub Secrets

Set these in your repo: **Settings → Secrets and variables → Actions → New repository secret**

| Secret | Value |
|--------|-------|
| `LIGHTSAIL_HOST` | Your Lightsail static IP address |
| `LIGHTSAIL_USER` | `ec2-user` |
| `LIGHTSAIL_KEY` | Contents of your SSH private key (`cat ~/.ssh/simple-cms-key.pem`) |
| `ROTATOR_KEY_ID` | AWS Access Key ID for the rotation-only IAM user (see below) |
| `ROTATOR_KEY_SECRET` | AWS Secret Key for the rotation IAM user |

---

## Rotation IAM User

The workflow uses a **separate** IAM user (`simple-cms-rotator`) with minimal permissions — it can only manage keys for `simple-cms-api`, nothing else.

1. Go to [IAM → Users](https://console.aws.amazon.com/iam/home#/users) and create a new user named `simple-cms-rotator`.

2. Attach this inline policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "iam:CreateAccessKey",
        "iam:DeleteAccessKey",
        "iam:ListAccessKeys"
      ],
      "Resource": "arn:aws:iam::*:user/simple-cms-api"
    }
  ]
}
```

3. Create an access key for `simple-cms-rotator` (type: **Application running outside AWS**).

4. Store the Key ID and Secret in GitHub secrets as `ROTATOR_KEY_ID` and `ROTATOR_KEY_SECRET`.

---

## Verify Rotation Worked

After the workflow runs, check that the new key is in place:

```bash
# In GitHub: go to Actions tab — the "Rotate IAM Key" workflow should show a green checkmark

# On the server:
ssh -i ~/.ssh/simple-cms-key.pem ec2-user@YOUR_LIGHTSAIL_IP

# Check the key ID was updated
grep AWS_ACCESS_KEY_ID /etc/simplecms/config.env

# Confirm the API started cleanly with the new key
docker compose -f ~/Simple-CMS/docker-compose.yml logs api | tail -20
```

---

## Manual Trigger

To rotate immediately without waiting for the 1st of the month:

1. Go to your GitHub repo → **Actions** → **Rotate IAM Key**
2. Click **Run workflow** → **Run workflow**
