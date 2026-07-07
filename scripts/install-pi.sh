#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/longan-fruit-fly-ai-monitor}"
REPO_URL="${REPO_URL:-https://github.com/project-sy789/longan-fruit-fly-ai-monitor.git}"
SERVICE_USER="${SERVICE_USER:-pi}"
ENV_DIR="/etc/longan-fruit-fly"
DATA_DIR="/var/lib/longan-fruit-fly"

if [[ $EUID -ne 0 ]]; then
  echo "กรุณารันด้วย sudo: sudo bash scripts/install-pi.sh"
  exit 1
fi

apt-get update
apt-get install -y git curl nodejs npm python3 python3-pip python3-opencv v4l-utils

if [[ ! -d "$APP_DIR/.git" ]]; then
  rm -rf "$APP_DIR"
  git clone "$REPO_URL" "$APP_DIR"
else
  git -C "$APP_DIR" pull --ff-only
fi

mkdir -p "$ENV_DIR" "$DATA_DIR/images" "$APP_DIR/data"
chown -R "$SERVICE_USER:$SERVICE_USER" "$APP_DIR" "$DATA_DIR" || true

if [[ ! -f "$ENV_DIR/trap-agent.env" ]]; then
  cp "$APP_DIR/config/trap-agent.env.example" "$ENV_DIR/trap-agent.env"
  sed -i 's#API_URL=.*#API_URL=http://localhost:3000/api/readings#' "$ENV_DIR/trap-agent.env"
  sed -i 's#TRAP_API_TOKEN=.*#TRAP_API_TOKEN=change-me#' "$ENV_DIR/trap-agent.env"
  chmod 600 "$ENV_DIR/trap-agent.env"
fi

cd "$APP_DIR"
npm install
npm run build

cat >/etc/systemd/system/longan-fruit-fly-web.service <<SERVICE
[Unit]
Description=Longan Fruit Fly AI Monitor Web
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$SERVICE_USER
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
Environment=TRAP_DATA_DIR=$APP_DIR/data
EnvironmentFile=-$ENV_DIR/trap-agent.env
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE

cat >/etc/systemd/system/longan-fruit-fly-agent.service <<SERVICE
[Unit]
Description=Longan Fruit Fly Camera Agent
After=network-online.target longan-fruit-fly-web.service
Wants=network-online.target

[Service]
Type=simple
User=$SERVICE_USER
WorkingDirectory=$APP_DIR
EnvironmentFile=$ENV_DIR/trap-agent.env
ExecStart=/usr/bin/python3 $APP_DIR/scripts/trap_agent.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl enable longan-fruit-fly-web.service longan-fruit-fly-agent.service
systemctl restart longan-fruit-fly-web.service longan-fruit-fly-agent.service

sleep 3
systemctl --no-pager --full status longan-fruit-fly-web.service || true
systemctl --no-pager --full status longan-fruit-fly-agent.service || true

echo "ติดตั้งเสร็จ: เปิด http://$(hostname -I | awk '{print $1}'):3000"
echo "แก้ config ได้ที่ $ENV_DIR/trap-agent.env แล้วรัน: sudo systemctl restart longan-fruit-fly-agent"
