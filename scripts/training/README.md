# Training pipeline: ฝึก YOLO จากรูปจริงบน MacBook M1

แนวทางหลักของโปรเจกต์นี้คือใช้ ESP32-CAM เก็บภาพในสวน แล้วนำภาพมา label/train บน MacBook M1 ที่โรงเรียน ไม่จำเป็นต้องตั้ง Raspberry Pi ทิ้งไว้ในสวน

## 1) เก็บรูป

ถ้า ESP32-CAM ส่งรูปเข้าเว็บที่รันบน MacBook/server รูปจะอยู่ที่:

```text
public/uploads/
```

ถ้าเลือกใช้ Raspberry Pi agent ภายหลัง รูปจะอยู่ที่:

```text
/var/lib/longan-fruit-fly/images/
```

ถ้าใช้ SD card จาก ESP32-CAM ให้ copy รูปที่หลากหลายมาไว้ใน:

```text
dataset_raw/images/
```

## 2) Label รูป

### วิธีง่าย: label ผ่านเว็บใน repo นี้

เปิดหน้า:

```text
http://localhost:3000/label
```

แล้วลากกล่องรอบแมลงวันทอง กด `Save YOLO` ระบบจะสร้างไฟล์ให้อัตโนมัติ:

```text
dataset_raw/images/
dataset_raw/labels/
```

### วิธีภายนอก

ใช้ Roboflow / CVAT / Label Studio / makesense.ai แล้ว export เป็น YOLO format

โครงสร้างที่ต้องได้:

```text
dataset_raw/
  images/
    img001.jpg
    img002.jpg
  labels/
    img001.txt
    img002.txt
```

ในไฟล์ label ใช้ class เดียว:

```text
0 = fruit_fly
```

ภาพที่ไม่มีแมลง ให้มีไฟล์ `.txt` ว่าง หรือไม่มีก็ได้ script จะสร้าง label ว่างให้

## 3) แบ่ง train/val อัตโนมัติ

```bash
python3 scripts/training/prepare_dataset.py --src dataset_raw --out dataset_yolo
```

## 4) Train YOLO

บน MacBook M1 แนะนำใช้ Python environment แยก เช่น `venv` หรือ `conda` แล้วติดตั้ง `ultralytics` ตามคำแนะนำของโปรเจกต์ YOLO ที่ใช้

```bash
bash scripts/training/train_yolo.sh
```

ปรับ epoch ได้:

```bash
EPOCHS=120 bash scripts/training/train_yolo.sh
```

## 5) Export model

```bash
bash scripts/training/export_model.sh
```

จะได้ ONNX สำหรับนำไปใช้ต่อกับ MacBook/server หรือ Raspberry Pi ถ้าต้องการระบบภาคสนามแบบ real-time ภายหลัง

## จำนวนรูปแนะนำ

| ระยะ | จำนวนภาพ |
|---|---:|
| รุ่นแรก | 100–300 |
| ใช้งานดีขึ้น | 500–1,000 |
| final | 1,000+ |

ต้องมีทั้งภาพที่มีแมลงและไม่มีแมลง เพื่อให้โมเดลไม่มั่ว
