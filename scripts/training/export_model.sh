#!/usr/bin/env bash
set -euo pipefail
MODEL_PATH="${MODEL_PATH:-runs/detect/longan_fruit_fly_detector/weights/best.pt}"
FORMAT="${FORMAT:-onnx}"
python3 -m pip install ultralytics

yolo export model="$MODEL_PATH" format="$FORMAT"
echo "Export done: $MODEL_PATH -> $FORMAT"
