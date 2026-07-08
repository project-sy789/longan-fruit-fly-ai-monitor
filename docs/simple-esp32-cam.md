# โหมดง่ายสุด: ESP32-CAM only

โหมดนี้เหมาะกับผู้ใช้ที่อยากทำให้ง่ายที่สุด: ใช้ ESP32-CAM เก็บภาพในสวน แล้วใช้ MacBook M1 ที่โรงเรียนสำหรับ label และ train โดยไม่ต้องตั้ง Raspberry Pi ทิ้งไว้ในสวน

## สิ่งที่ต้องมี

- ESP32-CAM AI Thinker 1 ตัว
- FTDI USB-to-Serial สำหรับ upload code
- WiFi ในบริเวณสวน หรือ hotspot มือถือ
- MacBook M1/คอมที่รัน repo นี้อยู่ หรือ server/dashboard ถ้ามี WiFi ในสวน

## หลักการ

```text
ESP32-CAM -> ถ่ายภาพ -> POST รูปไป /api/images หรือเก็บลง SD card -> MacBook M1 ใช้ดู/label/train dataset
```

ข้อดี:
- ถูก
- ต่ออุปกรณ์น้อย
- ใช้ Arduino IDE ได้

ข้อจำกัด:
- ESP32-CAM ไม่เหมาะกับการรัน AI หนัก ๆ บนบอร์ด
- เวอร์ชันง่ายนี้เน้นเก็บภาพจริงเพื่อทำ dataset ก่อน
- การ label และ train AI ควรทำบน MacBook M1/คอม/Cloud
- Raspberry Pi เป็น optional เฉพาะกรณีต้องการระบบประมวลผลในสวนตลอดเวลา

## ขั้นตอนใช้งาน

1. เปิด Arduino IDE
2. ติดตั้ง board: ESP32 by Espressif
3. เลือก board: `AI Thinker ESP32-CAM`
4. เปิดไฟล์:

```text
hardware/esp32-cam/esp32_cam_trap_sender.ino
```

5. แก้ค่า:

```cpp
const char* WIFI_SSID = "ชื่อ WiFi";
const char* WIFI_PASSWORD = "รหัส WiFi";
const char* IMAGE_API_URL = "http://IP_SERVER:3000/api/images";
const char* TRAP_TOKEN = "change-me";
const char* TRAP_ID = "ESP32-A1";
```

6. Upload เข้า ESP32-CAM
7. เปิด Serial Monitor 115200 ดูสถานะ

## ทดสอบ API ภาพ

ถ้าระบบรับภาพสำเร็จจะตอบประมาณนี้:

```json
{
  "ok": true,
  "imageUrl": "/uploads/ESP32-A1_1783440000000.jpg"
}
```

## ถ้าไม่มี WiFi ในสวน

ใช้ SD card เก็บภาพ แล้วค่อยนำรูปเข้า MacBook M1 เพื่อ label/train ที่โรงเรียน หรือใช้ hotspot มือถือเฉพาะตอนต้องการส่งรูปทดสอบ

## ถ้าต้องการ AI จริง

แนะนำลำดับนี้:

1. ใช้ ESP32-CAM เก็บภาพจริง 3–7 วัน
2. เอาภาพมา label
3. เปิดหน้า `http://localhost:3000/label` บน MacBook M1 แล้ววาดกรอบ
4. Train YOLO บน MacBook M1/Cloud
5. ถ้าต้องการใช้งานภาคสนามแบบ real-time ภายหลัง ค่อยเพิ่ม server/Raspberry Pi สำหรับวิเคราะห์ภาพ
