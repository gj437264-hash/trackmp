# 1. Create the app directory and a dedicated low-privilege user
useradd --system --home /opt/trackmp/seo-tasks --shell /usr/sbin/nologin trackmp
mkdir -p /opt/trackmp/seo-tasks/{logs,run}
chown -R trackmp:trackmp /opt/trackmp/seo-tasks

# 2. Deploy code (as root, then hand off ownership)
cd /opt/trackmp/seo-tasks
python3 -m venv venv
./venv/bin/pip install pymongo

# 3. .env — same convention as your main app, but with ONE canonical DB var name
cat > .env <<'EOF'
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=trackmp
BASE_URL=https://trackmp.example.com
SITEMAP_OUTPUT_DIR=/opt/trackmp/public
STATIC_OUTPUT_DIR=/opt/trackmp/public/politicians
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
EOF
chmod 600 .env
chown trackmp:trackmp .env

# 4. Install systemd units
#cp systemd/trackmp-seo.service systemd/trackmp-seo.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now trackmp-seo.timer

# 5. Verify
systemctl list-timers trackmp-seo.timer
systemctl start trackmp-seo.service   # manual first run
journalctl -u trackmp-seo.service -f
