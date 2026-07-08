# Longan Fruit Fly AI Monitor

ต้นแบบระบบ **เครื่องดักจับและประเมินการระบาดของแมลงวันทองด้วย AI** สำหรับสวนลำไย อำเภอซับใหญ่ จังหวัดชัยภูมิ

## สถานะโปรเจกต์

พร้อมใช้งานเป็น prototype สำหรับเก็บภาพจาก ESP32-CAM, label ภาพผ่านเว็บใน repo และ train โมเดลบน MacBook M1/เครื่องเรียน โดยไม่จำเป็นต้องตั้ง Raspberry Pi ทิ้งไว้ในสวน

## สิ่งที่ทำได้แล้ว

- Dashboard ภาษาไทยสำหรับดูสถานะสวนลำไย
- API รับข้อมูลจากอุปกรณ์จริง: `POST /api/readings`
- API ดึงข้อมูลไปแสดงผล: `GET /api/readings`
- Health check: `GET /api/health`
- วิเคราะห์ภาพใน browser แบบ heuristic computer vision
- หน้า `/label` สำหรับวาดกรอบแมลงวันทองและบันทึก label แบบ YOLO
- Training pipeline สำหรับเตรียม dataset และ train YOLO บนคอม/Cloud
- Raspberry Pi camera agent พร้อม OpenCV สำหรับกรณีต้องการติดตั้งระบบประมวลผลในสวนแบบ 24 ชั่วโมง
- systemd service สำหรับเปิดเว็บและ agent อัตโนมัติหลัง boot บน Raspberry Pi/Linux
- ESP32-CAM sketch starter
- Script ติดตั้งอัตโนมัติบน Raspberry Pi / Linux
- แจ้งเตือน Telegram ได้เมื่อจำนวนแมลงเกิน threshold

## สถาปัตยกรรมระบบ

```text
[สารล่อ/กับดัก] -> [ESP32-CAM]
        -> [เก็บรูปลง SD card หรือ POST ไป /api/images]
        -> [MacBook M1 เปิดเว็บ /label เพื่อทำ dataset]
        -> [Train YOLO บน MacBook M1/Cloud]
        -> [Dashboard / วิเคราะห์ภาพ / แจ้งเตือน]
```

## วิธีรันบนเครื่อง dev

```bash
npm install
npm run dev
```

เปิด `http://localhost:3000`

เปิดหน้า label dataset:

```text
http://localhost:3000/label
```

แนะนำสำหรับโปรเจกต์นี้: ใช้ MacBook M1 เป็นเครื่องหลักสำหรับรันเว็บ, label ภาพ และ train โมเดลที่โรงเรียน ส่วน ESP32-CAM ใช้เก็บภาพจากสวนเท่านั้น

## Workflow ที่แนะนำโดยไม่ใช้ Raspberry Pi

```text
ESP32-CAM ถ่ายรูปในสวน
-> ส่งรูปผ่าน WiFi/Hotspot หรือเก็บลง SD card
-> นำรูปเข้า MacBook M1
-> เปิด /label เพื่อวาดกรอบแมลงวันทอง
-> Save เป็น YOLO dataset
-> Train YOLO บน MacBook M1
```

เตรียม dataset หลัง label:

```bash
python3 scripts/training/prepare_dataset.py --src dataset_raw --out dataset_yolo
```

Train YOLO:

```bash
bash scripts/training/train_yolo.sh
```

ทดสอบส่งข้อมูลจำลองเข้า API:

```bash
TRAP_API_TOKEN=change-me bash scripts/test-post-reading.sh
```

## ทางเลือก: ติดตั้งอัตโนมัติบน Raspberry Pi

ส่วนนี้เป็นทางเลือกเท่านั้น ใช้เมื่ออยากให้มีเครื่องประมวลผล/เปิด dashboard/นับแมลงในสวนตลอด 24 ชั่วโมง ถ้าเป้าหมายคือเก็บภาพแล้ว train ที่โรงเรียน สามารถข้าม Raspberry Pi ได้

บน Raspberry Pi หรือเครื่อง Linux ที่ต่อกล้อง:

```bash
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/project-sy789/longan-fruit-fly-ai-monitor/main/scripts/install-pi.sh)"
```

หรือถ้า clone repo แล้ว:

```bash
git clone https://github.com/project-sy789/longan-fruit-fly-ai-monitor.git
cd longan-fruit-fly-ai-monitor
sudo bash scripts/install-pi.sh
```

หลังติดตั้ง:

```bash
sudo nano /etc/longan-fruit-fly/trap-agent.env
sudo systemctl restart longan-fruit-fly-agent
sudo systemctl status longan-fruit-fly-web
sudo systemctl status longan-fruit-fly-agent
```

เปิด dashboard:

```text
http://<IP-Raspberry-Pi>:3000
```

## Config อุปกรณ์

ไฟล์ตัวอย่าง: `config/trap-agent.env.example`

```env
TRAP_ID=A1
TRAP_NAME=กับดัก A1
TRAP_LOCATION=สวนลำไย อำเภอซับใหญ่ จังหวัดชัยภูมิ
API_URL=http://localhost:3000/api/readings
TRAP_API_TOKEN=change-me
CAMERA_INDEX=0
CAPTURE_INTERVAL_SECONDS=1800
IMAGE_DIR=/var/lib/longan-fruit-fly/images
ALERT_THRESHOLD=25
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

## API

### GET `/api/readings`

คืนรายการข้อมูลจากกับดัก ถ้ายังไม่มีข้อมูลจริงจะคืน demo data

### POST `/api/readings`

Header:

```http
Content-Type: application/json
x-trap-token: change-me
```

Body:

```json
{
  "trapId": "A1",
  "trapName": "กับดัก A1",
  "location": "สวนลำไย อำเภอซับใหญ่ จังหวัดชัยภูมิ",
  "count": 27,
  "temperature": 31,
  "humidity": 78,
  "battery": 92,
  "source": "pi-agent"
}
```

ระดับการระบาดคำนวณอัตโนมัติ:

| จำนวนแมลง/รอบตรวจ | ระดับ |
|---:|---|
| 0–9 | ต่ำ |
| 10–24 | เฝ้าระวัง |
| 25+ | ระบาด |

## Raspberry Pi Camera Agent optional

ไฟล์: `scripts/trap_agent.py`

ความสามารถ:

- เปิดกล้อง `/dev/video0`
- ถ่ายภาพตามรอบเวลา
- วิเคราะห์วัตถุที่คล้ายแมลงวันทองด้วย OpenCV
- บันทึกภาพ annotated
- POST จำนวนเข้า API
- ส่ง Telegram alert เมื่อเกิน threshold

รันทดสอบครั้งเดียว:

```bash
RUN_ONCE=true python3 scripts/trap_agent.py
```

## โหมดง่ายสุด: ESP32-CAM มี WiFi แล้วส่งรูปเข้าเว็บ

ไฟล์: `hardware/esp32-cam/esp32_cam_trap_sender.ino`

ถ้ามีเน็ต/WiFi ในสวน ไม่ต้องถอด SD card:

```text
ESP32-CAM -> ถ่ายภาพทุก 30 นาที -> POST รูปไป /api/images -> server เก็บรูปใน public/uploads
```

API ที่ใช้รับภาพ:

```text
POST /api/images
Content-Type: image/jpeg
x-trap-token: change-me
x-trap-id: ESP32-A1
x-trap-name: กับดัก ESP32-CAM A1
```

ดูคู่มือแบบง่ายที่:

```text
docs/simple-esp32-cam.md
```

ถ้าไม่มีเน็ตในสวน ค่อยใช้ทางเลือกเก็บรูปลง SD card แล้วไปถอดมาทีหลัง

## หัวข้อบทที่ 2 ที่แนะนำ

1. แมลงวันทอง: ชีววิทยา วงจรชีวิต และความสำคัญทางเศรษฐกิจ
2. ลำไยและบริบทสวนลำไยในอำเภอซับใหญ่ จังหวัดชัยภูมิ
3. สารล่อแมลงวันทอง เช่น methyl eugenol และสารล่อจากธรรมชาติ
4. หลักการออกแบบกับดักแมลงวันทองและการเก็บตัวอย่างภาคสนาม
5. ปัญญาประดิษฐ์และ Computer Vision สำหรับตรวจจับ/นับจำนวนแมลง
6. IoT และระบบแจ้งเตือนอัตโนมัติสำหรับเกษตรกร
7. งานวิจัยที่เกี่ยวข้องและช่องว่างของงานวิจัย

## ถ้าจะใช้ Raspberry Pi ภายหลัง

- ต่อกล้องกับ Raspberry Pi
- เช็คกล้อง: `v4l2-ctl --list-devices`
- แก้ `CAMERA_INDEX` ใน `/etc/longan-fruit-fly/trap-agent.env`
- ตั้ง `TRAP_API_TOKEN` ให้ตรงกับระบบ
- ใส่ Telegram token/chat id ถ้าต้องการแจ้งเตือน
- Restart service

## หมายเหตุเรื่อง AI

ตอนนี้ใช้ heuristic computer vision + OpenCV เพื่อให้ติดตั้งง่ายและอธิบายในโครงงานได้ง่าย

ถ้าจะยกระดับเป็นระบบจริง แนะนำขั้นต่อไป:

- เก็บภาพแมลงวันทองจริงจากกับดัก
- Label ภาพผ่านหน้า `/label` ใน repo นี้ หรือใช้ Roboflow / CVAT
- Train YOLOv8/YOLOv11
- Export เป็น ONNX/TensorFlow Lite
- แทน `count_fruit_fly_like_objects()` ใน `scripts/trap_agent.py`

## License

MIT
