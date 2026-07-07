# โหมดง่ายสุด: ESP32-CAM only

โหมดนี้เหมาะกับผู้ใช้ที่อยากทำให้ง่ายที่สุด ไม่ใช้ Raspberry Pi ก่อน

## สิ่งที่ต้องมี

- ESP32-CAM AI Thinker 1 ตัว
- FTDI USB-to-Serial สำหรับ upload code
- WiFi ในบริเวณสวน หรือ hotspot มือถือ
- Server/Dashboard ที่รัน repo นี้อยู่

## หลักการ

```text
ESP32-CAM -> ถ่ายภาพ -> POST รูปไป /api/images -> Dashboard เก็บรูปไว้ใช้ดู/ทำ dataset
```

ข้อดี:
- ถูก
- ต่ออุปกรณ์น้อย
- ใช้ Arduino IDE ได้

ข้อจำกัด:
- ESP32-CAM ไม่เหมาะกับการรัน AI หนัก ๆ บนบอร์ด
- เวอร์ชันง่ายนี้เน้นเก็บภาพและส่งเข้าระบบก่อน
- การนับแมลงแบบ AI ควรทำบน server/Raspberry Pi ภายหลัง

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

ใช้ hotspot มือถือช่วงติดตั้งก่อน หรือใช้โหมดเก็บภาพใน SD card ภายหลัง

## ถ้าต้องการ AI จริง

แนะนำลำดับนี้:

1. ใช้ ESP32-CAM เก็บภาพจริง 3–7 วัน
2. เอาภาพมา label
3. Train YOLO บนคอม/Cloud
4. ให้ server/Raspberry Pi วิเคราะห์ภาพจาก ESP32-CAM
