# DNS Setup

Add these records at your domain registrar (Namecheap, Cloudflare, Route 53, etc.) to point your subdomains to the API and Admin UI.

---

## Records

| Type | Host | Value | TTL |
|------|------|-------|-----|
| A | `api` | `YOUR_LIGHTSAIL_IP` | 300 |
| CNAME | `admin` | `cname.vercel-dns.com` | 300 |

Where:
- `YOUR_LIGHTSAIL_IP` — your Lightsail static IP address (find it in the Lightsail console under Networking)
- `cname.vercel-dns.com` — Vercel's CNAME target. Vercel may assign a different value for your project — check **Vercel → your project → Settings → Domains** for the exact string to use

---

## Verify

DNS propagation typically takes 5–60 minutes. Test with:

```bash
dig api.your-domain.com A
dig admin.your-domain.com CNAME
```

Once the A record resolves, Caddy will automatically obtain a Let's Encrypt TLS certificate for `api.your-domain.com` on the first HTTPS request.

Once the CNAME resolves, Vercel will issue a TLS certificate for `admin.your-domain.com` automatically (you may need to click **Verify** in the Vercel Domains settings).

---

## Notes

- These two records only add the `api` and `admin` subdomains. All other existing DNS records (MX, TXT, www, etc.) are unaffected.
- If you ever change your Lightsail static IP or Vercel project, update the corresponding record here.
