
# Proxy & Outbound Scanning Guide

VulnScan Pro supports routing scan traffic through rotating proxies to bypass simple IP blocks, scan from different geolocations, or access restricted networks.

## 1. Configuring Proxies

Proxies are configured via environment variables passed to the Worker process.

### Environment Variable
Set the `PROXY_LIST` variable with a comma-separated list of proxy URLs.

**Format:**
```bash
PROXY_LIST="http://user:pass@1.2.3.4:8080,http://5.6.7.8:3128"
```

**Supported Protocols:**
- HTTP
- HTTPS
- SOCKS5 (e.g., `socks5://...`)

### Behavior
- The scanner will pick a random proxy from the list for each scan job.
- Proxy credentials are automatically redacted before logging to the database.
- Proxy usage is logged in the `proxy_logs` table for auditing.

---

## 2. Scanning Localhost & Private Networks

To scan a local development server or a private staging environment from the external scanner worker, you must expose the service via a secure tunnel.

### Option A: ngrok (Recommended)

1.  **Install ngrok**
    Download from [ngrok.com](https://ngrok.com).

2.  **Start your local app**
    ```bash
    npm run dev  # Running on localhost:3000
    ```

3.  **Start the tunnel**
    ```bash
    ngrok http 3000
    ```

4.  **Scan the URL**
    Copy the `https://xxxx-xx-xx-xx-xx.ngrok-free.app` URL and paste it into the VulnScan Pro target field.

### Option B: Cloudflare Tunnel (Cloudflared)

1.  **Install cloudflared**
    Follow instructions on Cloudflare Zero Trust docs.

2.  **Run Quick Tunnel**
    ```bash
    cloudflared tunnel --url http://localhost:3000
    ```

3.  **Scan the URL**
    Use the generated `https://...trycloudflare.com` URL as your scan target.

### Note on WAFs
If scanning a target protected by a strict WAF (e.g., Cloudflare, AWS WAF), using a residential proxy pool via `PROXY_LIST` can help reduce blocking, but aggressive DAST payloads may still be challenged.
