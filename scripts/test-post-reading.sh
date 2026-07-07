#!/usr/bin/env bash
set -euo pipefail
URL="${URL:-http://localhost:3000/api/readings}"
TOKEN="${TRAP_API_TOKEN:-change-me}"
curl -sS -X POST "$URL" \
  -H "Content-Type: application/json" \
  -H "x-trap-token: $TOKEN" \
  -d '{"trapId":"A1","trapName":"กับดัก A1","location":"สวนลำไยซับใหญ่","count":27,"temperature":31,"humidity":78,"battery":92,"source":"manual"}' | python3 -m json.tool
