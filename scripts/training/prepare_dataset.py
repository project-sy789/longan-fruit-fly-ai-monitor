#!/usr/bin/env python3
"""Prepare a YOLO dataset folder from collected/labelled images.

Expected source layout after labeling/export/manual copy:
  dataset_raw/
    images/*.jpg
    labels/*.txt   # YOLO format: class x_center y_center width height

Output:
  dataset_yolo/
    images/train, images/val
    labels/train, labels/val
    data.yaml
"""
import argparse, random, shutil
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--src', default='dataset_raw')
parser.add_argument('--out', default='dataset_yolo')
parser.add_argument('--val-ratio', type=float, default=0.2)
parser.add_argument('--seed', type=int, default=42)
args = parser.parse_args()

src = Path(args.src)
out = Path(args.out)
images = sorted((src / 'images').glob('*.*'))
labels_dir = src / 'labels'
if not images:
    raise SystemExit(f'No images found in {src / "images"}')

random.seed(args.seed)
random.shuffle(images)
val_count = max(1, int(len(images) * args.val_ratio))
val = set(images[:val_count])

for split in ['train', 'val']:
    (out / 'images' / split).mkdir(parents=True, exist_ok=True)
    (out / 'labels' / split).mkdir(parents=True, exist_ok=True)

for image in images:
    split = 'val' if image in val else 'train'
    shutil.copy2(image, out / 'images' / split / image.name)
    label = labels_dir / f'{image.stem}.txt'
    target_label = out / 'labels' / split / f'{image.stem}.txt'
    if label.exists():
        shutil.copy2(label, target_label)
    else:
        target_label.write_text('')

data_yaml = """path: .
train: images/train
val: images/val
names:
  0: fruit_fly
"""
(out / 'data.yaml').write_text(data_yaml, encoding='utf-8')

print(f'Prepared {len(images)} images -> {out}')
print(f'Train: {len(images)-val_count}, Val: {val_count}')
