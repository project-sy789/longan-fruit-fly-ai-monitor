#!/usr/bin/env python3
"""Raspberry Pi / Linux camera agent for Longan Fruit Fly AI Monitor.

- Captures an image from USB camera / Pi camera exposed as V4L2 (/dev/video0)
- Counts fruit-fly-like objects with a lightweight OpenCV color/connected-component heuristic
- Posts readings to the Next.js API
- Optional Telegram alert when count exceeds threshold
"""
import base64
import json
import os
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

try:
    import cv2
    import numpy as np
except Exception as exc:  # pragma: no cover
    raise SystemExit("OpenCV not installed. Run scripts/install-pi.sh first.") from exc


def env(name: str, default: str = "") -> str:
    return os.environ.get(name, default)


TRAP_ID = env("TRAP_ID", "A1")
TRAP_NAME = env("TRAP_NAME", f"กับดัก {TRAP_ID}")
TRAP_LOCATION = env("TRAP_LOCATION", "สวนลำไย อำเภอซับใหญ่ จังหวัดชัยภูมิ")
API_URL = env("API_URL", "http://localhost:3000/api/readings")
TRAP_API_TOKEN = env("TRAP_API_TOKEN", "")
CAMERA_INDEX = int(env("CAMERA_INDEX", "0"))
CAPTURE_INTERVAL_SECONDS = int(env("CAPTURE_INTERVAL_SECONDS", "1800"))
IMAGE_DIR = Path(env("IMAGE_DIR", "/var/lib/longan-fruit-fly/images"))
MIN_COMPONENT_AREA = int(env("MIN_COMPONENT_AREA", "12"))
MAX_COMPONENT_RATIO = float(env("MAX_COMPONENT_RATIO", "0.05"))
ALERT_THRESHOLD = int(env("ALERT_THRESHOLD", "25"))
TELEGRAM_BOT_TOKEN = env("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = env("TELEGRAM_CHAT_ID")


def count_fruit_fly_like_objects(frame):
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    r = rgb[:, :, 0]
    g = rgb[:, :, 1]
    b = rgb[:, :, 2]
    maxc = np.maximum.reduce([r, g, b])
    minc = np.minimum.reduce([r, g, b])
    chroma = maxc - minc

    golden_body = (r > 95) & (g > 55) & (g < 170) & (b < 95) & (chroma > 35)
    dark_body = (r < 90) & (g < 85) & (b < 75) & (chroma < 55)
    wing_brown = (r > 80) & (r < 170) & (g > 55) & (g < 135) & (b > 35) & (b < 115) & (chroma > 20)
    mask = (golden_body | dark_body | wing_brown).astype("uint8") * 255

    kernel = np.ones((3, 3), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    h, w = mask.shape
    boxes = []
    for label in range(1, num_labels):
        x, y, bw, bh, area = stats[label]
        if area < MIN_COMPONENT_AREA:
            continue
        if area > w * h * MAX_COMPONENT_RATIO:
            continue
        if bw < 4 or bh < 4:
            continue
        ratio = bw / max(bh, 1)
        if ratio > 4.5 or ratio < 0.22:
            continue
        boxes.append((int(x), int(y), int(bw), int(bh), int(area)))
    return boxes, mask


def post_json(url: str, payload: dict):
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    headers = {"Content-Type": "application/json", "User-Agent": "longan-fruit-fly-agent/1.0"}
    if TRAP_API_TOKEN:
        headers["x-trap-token"] = TRAP_API_TOKEN
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=30) as response:
        return response.read().decode("utf-8")


def send_telegram(message: str):
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {"chat_id": TELEGRAM_CHAT_ID, "text": message}
    req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers={"Content-Type": "application/json"})
    urllib.request.urlopen(req, timeout=20).read()


def capture_once():
    IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    camera = cv2.VideoCapture(CAMERA_INDEX)
    if not camera.isOpened():
        raise RuntimeError(f"Cannot open camera index {CAMERA_INDEX}")
    time.sleep(1.0)
    ok, frame = camera.read()
    camera.release()
    if not ok:
        raise RuntimeError("Camera read failed")

    boxes, _ = count_fruit_fly_like_objects(frame)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    image_path = IMAGE_DIR / f"{TRAP_ID}_{timestamp}.jpg"

    annotated = frame.copy()
    for idx, (x, y, w, h, _) in enumerate(boxes, start=1):
        cv2.rectangle(annotated, (x, y), (x + w, y + h), (0, 255, 80), 2)
        cv2.putText(annotated, str(idx), (x, max(14, y - 4)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 80), 2)
    cv2.imwrite(str(image_path), annotated)

    payload = {
        "trapId": TRAP_ID,
        "trapName": TRAP_NAME,
        "location": TRAP_LOCATION,
        "count": len(boxes),
        "recordedAt": datetime.now(timezone.utc).isoformat(),
        "imagePath": str(image_path),
        "confidence": 0.72 if boxes else 0,
        "source": "pi-agent",
    }
    result = post_json(API_URL, payload)
    print(json.dumps({"posted": payload, "api": result}, ensure_ascii=False))

    if len(boxes) >= ALERT_THRESHOLD:
        send_telegram(f"⚠️ พบแมลงวันทอง {len(boxes)} ตัว ที่ {TRAP_NAME} ({TRAP_LOCATION})")


def main():
    once = env("RUN_ONCE", "false").lower() in {"1", "true", "yes"}
    while True:
        try:
            capture_once()
        except Exception as exc:
            print(json.dumps({"error": str(exc)}, ensure_ascii=False), flush=True)
        if once:
            return
        time.sleep(CAPTURE_INTERVAL_SECONDS)


if __name__ == "__main__":
    main()
