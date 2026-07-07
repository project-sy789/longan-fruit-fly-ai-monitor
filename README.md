# Longan Fruit Fly AI Monitor

ต้นแบบระบบ **เครื่องดักจับและประเมินการระบาดของแมลงวันทองด้วย AI** สำหรับสวนลำไย อำเภอซับใหญ่ จังหวัดชัยภูมิ

## สถานะโปรเจกต์

พร้อมใช้งานเป็น prototype และเตรียม code สำหรับติดตั้งบนอุปกรณ์จริงแล้ว เหลือแค่รอ Raspberry Pi / กล้อง / ESP32-CAM มาเชื่อมต่อ

## สิ่งที่ทำได้แล้ว

- Dashboard ภาษาไทยสำหรับดูสถานะสวนลำไย
- API รับข้อมูลจากอุปกรณ์จริง: `POST /api/readings`
- API ดึงข้อมูลไปแสดงผล: `GET /api/readings`
- Health check: `GET /api/health`
- วิเคราะห์ภาพใน browser แบบ heuristic computer vision
- Raspberry Pi camera agent พร้อม OpenCV
- systemd service สำหรับเปิดเว็บและ agent อัตโนมัติหลัง boot
- ESP32-CAM sketch starter
- Script ติดตั้งอัตโนมัติบน Raspberry Pi / Linux
- แจ้งเตือน Telegram ได้เมื่อจำนวนแมลงเกิน threshold

## สถาปัตยกรรมระบบ

```text
[สารล่อ/กับดัก] -> [กล้อง USB/RPi/ESP32-CAM]
        -> [Python/OpenCV agent หรือ server vision]
        -> [Next.js API /api/readings]
        -> [Dashboard]
        -> [Telegram/LINE alert]
```

## วิธีรันบนเครื่อง dev

```bash
npm install
npm run dev
```

เปิด `http://localhost:3000`

ทดสอบส่งข้อมูลจำลองเข้า API:

```bash
TRAP_API_TOKEN=change-me bash scripts/test-post-reading.sh
```

## วิธีติดตั้งอัตโนมัติบน Raspberry Pi

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

## Raspberry Pi Camera Agent

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

## ESP32-CAM

ไฟล์: `hardware/esp32-cam/esp32_cam_trap_sender.ino`

ใช้เป็น starter sketch สำหรับส่งข้อมูลเข้า API ก่อน เมื่อต้องส่งภาพจริงสามารถต่อยอดเป็น:

- ESP32-CAM ถ่ายภาพ -> ส่ง HTTP multipart ไป server vision
- ESP32-CAM ถ่ายภาพ -> upload ไป storage -> ส่ง URL เข้า API
- ESP32-CAM ส่งแค่ metadata แล้วให้ Raspberry Pi ทำ AI

## หัวข้อบทที่ 2 ที่แนะนำ

1. แมลงวันทอง: ชีววิทยา วงจรชีวิต และความสำคัญทางเศรษฐกิจ
2. ลำไยและบริบทสวนลำไยในอำเภอซับใหญ่ จังหวัดชัยภูมิ
3. สารล่อแมลงวันทอง เช่น methyl eugenol และสารล่อจากธรรมชาติ
4. หลักการออกแบบกับดักแมลงวันทองและการเก็บตัวอย่างภาคสนาม
5. ปัญญาประดิษฐ์และ Computer Vision สำหรับตรวจจับ/นับจำนวนแมลง
6. IoT และระบบแจ้งเตือนอัตโนมัติสำหรับเกษตรกร
7. งานวิจัยที่เกี่ยวข้องและช่องว่างของงานวิจัย

## สิ่งที่ต้องทำเมื่ออุปกรณ์มาถึง

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
- Label ภาพด้วย Roboflow / CVAT
- Train YOLOv8/YOLOv11
- Export เป็น ONNX/TensorFlow Lite
- แทน `count_fruit_fly_like_objects()` ใน `scripts/trap_agent.py`

## License

MIT
