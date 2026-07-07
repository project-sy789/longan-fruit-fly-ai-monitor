#!/usr/bin/env bash
set -euo pipefail
npm install
npm run build
mkdir -p data
cp -n config/trap-agent.env.example .env.trap || true
cat <<MSG
ติดตั้ง dev เสร็จ
1) npm run dev
2) ทดสอบ POST: bash scripts/test-post-reading.sh
MSG
