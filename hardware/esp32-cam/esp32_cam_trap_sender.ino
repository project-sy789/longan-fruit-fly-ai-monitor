/*
  Longan Fruit Fly AI Monitor - Simple ESP32-CAM mode

  ใช้งานง่ายสุด:
  1) ESP32-CAM ถ่ายภาพ JPG
  2) ส่งภาพเข้า Next.js API: /api/images
  3) Dashboard เก็บภาพไว้ใช้ดู/ทำ dataset/ฝึก AI ภายหลัง

  Board: AI Thinker ESP32-CAM
*/

#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>

// ===== แก้ค่าตรงนี้ =====
const char* WIFI_SSID = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* IMAGE_API_URL = "http://YOUR_SERVER_IP:3000/api/images";
const char* TRAP_TOKEN = "change-me";
const char* TRAP_ID = "ESP32-A1";
const char* TRAP_NAME = "กับดัก ESP32-CAM A1";
const unsigned long CAPTURE_INTERVAL_MS = 30UL * 60UL * 1000UL; // 30 นาที
// =======================

// AI Thinker ESP32-CAM pins
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

bool setupCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;

  if (psramFound()) {
    config.frame_size = FRAMESIZE_SVGA;   // 800x600
    config.jpeg_quality = 12;
    config.fb_count = 2;
  } else {
    config.frame_size = FRAMESIZE_VGA;    // 640x480
    config.jpeg_quality = 14;
    config.fb_count = 1;
  }

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed: 0x%x\n", err);
    return false;
  }
  return true;
}

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("WiFi connecting");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("WiFi connected: ");
  Serial.println(WiFi.localIP());
}

void captureAndUpload() {
  camera_fb_t* fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("Camera capture failed");
    return;
  }

  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  HTTPClient http;
  http.begin(IMAGE_API_URL);
  http.addHeader("Content-Type", "image/jpeg");
  http.addHeader("x-trap-token", TRAP_TOKEN);
  http.addHeader("x-trap-id", TRAP_ID);
  http.addHeader("x-trap-name", TRAP_NAME);

  int statusCode = http.POST(fb->buf, fb->len);
  String response = http.getString();

  Serial.printf("Upload status: %d\n", statusCode);
  Serial.println(response);

  http.end();
  esp_camera_fb_return(fb);
}

void setup() {
  Serial.begin(115200);
  Serial.println("Longan Fruit Fly ESP32-CAM starting...");
  connectWiFi();
  if (!setupCamera()) {
    Serial.println("Camera setup failed. Restarting in 10 seconds.");
    delay(10000);
    ESP.restart();
  }
  captureAndUpload();
}

void loop() {
  delay(CAPTURE_INTERVAL_MS);
  captureAndUpload();
}
