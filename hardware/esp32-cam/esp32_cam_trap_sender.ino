/*
  ESP32-CAM sender for Longan Fruit Fly AI Monitor
  - ถ่ายภาพตามรอบเวลา
  - เวอร์ชันนี้ส่ง metadata/count ตัวอย่างไป API ก่อน
  - ถ้าต้องส่งภาพจริง ให้ต่อยอดเป็น multipart upload หรือส่งเข้า server vision แยก
*/
#include <WiFi.h>
#include <HTTPClient.h>

const char* WIFI_SSID = "YOUR_WIFI";
const char* WIFI_PASSWORD = "YOUR_PASSWORD";
const char* API_URL = "http://YOUR_SERVER:3000/api/readings";
const char* TRAP_TOKEN = "change-me";
const char* TRAP_ID = "ESP32-A1";

void setup() {
  Serial.begin(115200);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("WiFi connected");
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(API_URL);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("x-trap-token", TRAP_TOKEN);

    // TODO: แทนที่ count ด้วยค่าจาก server vision หรือ sensor จริง
    int count = random(0, 35);
    String payload = String("{\"trapId\":\"") + TRAP_ID +
      "\",\"trapName\":\"กับดัก ESP32-CAM\",\"location\":\"สวนลำไย อำเภอซับใหญ่ จังหวัดชัยภูมิ\",\"count\":" +
      String(count) + ",\"source\":\"esp32-cam\"}";

    int code = http.POST(payload);
    Serial.printf("POST %d: %s\n", code, http.getString().c_str());
    http.end();
  }
  delay(30UL * 60UL * 1000UL);
}
