# TrackMP — Self-Host on a Simple Linux Server

A community-built ledger of politicians' promises and work. This guide is for a single Ubuntu 22.04 / Debian 12 VPS (1 vCPU / 1 GB RAM is enough to start).

---

## Stack
- **Backend**: Python 3.11 · FastAPI · Uvicorn · Motor (async MongoDB driver)
- **Frontend**: React 19 · Tailwind · shadcn/ui (built to static files, served by nginx)
- **Database**: MongoDB 7.x
- **Reverse proxy**: nginx + (optional) Let's Encrypt TLS
- **Process manager**: systemd

---

## 0. Prerequisites

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl build-essential nginx ufw
```

Allow web traffic:
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

## 1. Install MongoDB

```bash
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
  sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl enable --now mongod
```

Verify: `mongosh --eval "db.runCommand({ping:1})"` should print `{ ok: 1 }`.

---

## 2. Install Python 3.11

```bash
sudo apt install -y python3.11 python3.11-venv python3-pip
```

---

## 3. Install Node + yarn

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo corepack enable
sudo corepack prepare yarn@1.22.22 --activate
```

---

## 4. Clone the project

```bash
sudo mkdir -p /opt/trackmp && sudo chown $USER /opt/trackmp
cd /opt/trackmp
# Either clone your repo, or copy the /app folder up to the server:
#   scp -r ./app user@server:/opt/trackmp/
```

Project layout expected:
```
/opt/trackmp/
├── backend/        # FastAPI app (server.py, requirements.txt, .env)
└── frontend/       # React app
```

---

## 5. Configure environment variables

### Backend — `/opt/trackmp/backend/.env`
```
MONGO_URL="mongodb://localhost:27017"
DB_NAME="trackmp"
CORS_ORIGINS="https://your-domain.com"
JWT_SECRET="REPLACE_WITH_64_CHAR_HEX"
FRONTEND_URL="https://your-domain.com"
ADMIN_EMAIL="admin@your-domain.com"
ADMIN_PASSWORD="REPLACE_WITH_A_STRONG_PASSWORD"
```

Generate a real secret:
```bash
python3 -c "import secrets;print(secrets.token_hex(32))"
```

### Frontend — `/opt/trackmp/frontend/.env`
```
REACT_APP_BACKEND_URL=https://your-domain.com
```

---

## 6. Install & build

### Backend
```bash
cd /opt/trackmp/backend
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
deactivate
```

### Frontend (build static bundle)
```bash
cd /opt/trackmp/frontend
yarn install --frozen-lockfile
yarn build
# Outputs to /opt/trackmp/frontend/build
```

---

## 7. Run backend with systemd

Create `/etc/systemd/system/trackmp-backend.service`:
```ini
[Unit]
Description=TrackMP FastAPI backend
After=network.target mongod.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=/opt/trackmp/backend
EnvironmentFile=/opt/trackmp/backend/.env
ExecStart=/opt/trackmp/backend/venv/bin/uvicorn server:app --host 127.0.0.1 --port 8001 --workers 2
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

Enable + start:
```bash
sudo chown -R www-data:www-data /opt/trackmp
sudo systemctl daemon-reload
sudo systemctl enable --now trackmp-backend
sudo systemctl status trackmp-backend
```

Logs: `sudo journalctl -u trackmp-backend -f`

---

## 8. Nginx (serves frontend + proxies `/api`)

Create `/etc/nginx/sites-available/trackmp`:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /opt/trackmp/frontend/build;
    index index.html;

    # API → FastAPI
    location ^~ /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # React SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Static cache
    location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable:
```bash
sudo ln -s /etc/nginx/sites-available/trackmp /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## 9. HTTPS (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

Certbot will edit the nginx config and set up auto-renewal.

> **Important**: Auth cookies use `SameSite=None; Secure`. They only work over **HTTPS**. Either run with TLS as above, or change `secure=True` to `secure=False` and `samesite="lax"` in `backend/server.py → set_auth_cookie()` for plain HTTP / LAN testing.

---

## 10. First run

Visit `https://your-domain.com`. The backend auto-seeds the admin user from `.env` on first start.

- Log in at `/login` with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
- Add a politician, log promises, verify entries.

---

## Updating

```bash
cd /opt/trackmp && git pull         # or rsync new files
cd backend && source venv/bin/activate && pip install -r requirements.txt && deactivate
cd ../frontend && yarn install && yarn build
sudo systemctl restart trackmp-backend
sudo systemctl reload nginx
```

---

## Backups

```bash
# Daily MongoDB backup
sudo mkdir -p /var/backups/trackmp
sudo crontab -e
# add:
0 3 * * * mongodump --db=trackmp --out=/var/backups/trackmp/$(date +\%F) && find /var/backups/trackmp -mtime +14 -type d -exec rm -rf {} +
```

---

## Troubleshooting

| Symptom | Check |
|---|---|
| `502 Bad Gateway` | `sudo systemctl status trackmp-backend` and `journalctl -u trackmp-backend -n 100` |
| Login works but `GET /api/auth/me` returns 401 | HTTPS not enabled — cookies require Secure. The frontend also stores a Bearer token in `localStorage` as a fallback, so most flows still work. |
| Frontend shows blank page | Confirm `yarn build` succeeded and `REACT_APP_BACKEND_URL` was set **before** the build |
| Admin not seeded | Tail backend logs on startup; the line `Seeded admin: ...` should appear once |
| CORS error in browser console | `CORS_ORIGINS` in backend `.env` must include the exact `https://your-domain.com` |

---

That's it. A single small VPS will comfortably serve a launch-grade community.
