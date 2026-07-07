#!/usr/bin/env bash
set -euo pipefail
DATASET="${DATASET:-dataset_yolo/data.yaml}"
MODEL="${MODEL:-yolo11n.pt}"
EPOCHS="${EPOCHS:-80}"
IMGSZ="${IMGSZ:-640}"
NAME="${NAME:-longan_fruit_fly_detector}"

python3 -m pip install --upgrade pip
python3 -m pip install ultralytics

yolo detect train \
  data="$DATASET" \
  model="$MODEL" \
  epochs="$EPOCHS" \
  imgsz="$IMGSZ" \
  name="$NAME"

echo "Training done. Best model: runs/detect/$NAME/weights/best.pt"
