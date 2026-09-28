/*
 * NestGuard — ESP32 sensor firmware
 *
 * Reads DHT22 (temperature/humidity), MQ-135 (air quality), LDR (light), and
 * a sound sensor, then POSTs a JSON reading to the NestGuard backend every
 * POST_INTERVAL_MS.
 *
 * NOT FLASH-TESTED — there was no physical ESP32/sensors available to test
 * this against when it was written. Before relying on it:
 *   1. Double-check every pin number below against your actual wiring.
 *   2. The MQ-135 needs several minutes to warm up after first power-on —
 *      readings will look wrong/high during that window, that's normal, not
 *      a wiring fault.
 *   3. Install two libraries via Arduino IDE > Tools > Manage Libraries:
 *        - "DHT sensor library" by Adafruit (also installs "Adafruit
 *          Unified Sensor" as a dependency — accept it)
 *        - "ArduinoJson" by Benoit Blanchon
 *      WiFi.h / HTTPClient.h need no install — they ship with the ESP32
 *      board core (Boards Manager > "esp32" by Espressif Systems).
 *
 * Wiring (ESP32 ADC1 pins only — ADC2 conflicts with Wi-Fi when it's active):
 *   DHT22 data   -> GPIO4  (digital)
 *   MQ-135 AOUT  -> GPIO34 (analog, input-only pin)
 *   LDR AOUT     -> GPIO35 (analog, input-only pin)
 *   Sound AOUT   -> GPIO32 (analog)
 *   All sensor VCC/GND to the ESP32's 3V3/GND (check your modules aren't 5V-only).
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ---- Edit these for your deployment ----
const char *WIFI_SSID = "YOUR_WIFI_SSID";
const char *WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char *BACKEND_URL = "http://192.168.1.100:8000";  // your laptop's local IP, from `ipconfig`
const char *ENCLOSURE_ID = "COOP1";                      // must match an ID registered on the dashboard
const char *API_KEY = "dev-local-key";                   // must match backend/.env's API_KEY
// -----------------------------------------

#define DHT_PIN 4
#define DHT_TYPE DHT22
#define MQ135_PIN 34
#define LDR_PIN 35
#define SOUND_PIN 32
#define POST_INTERVAL_MS 30000

DHT dht(DHT_PIN, DHT_TYPE);

void connectWiFi() {
  Serial.printf("Connecting to Wi-Fi \"%s\"", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.printf("Connected, IP: %s\n", WiFi.localIP().toString().c_str());
}

void setup() {
  Serial.begin(115200);
  dht.begin();
  connectWiFi();
}

void postReading(float temperature, float humidity, int airQuality, int light, int sound) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Wi-Fi dropped, reconnecting...");
    connectWiFi();
  }

  JsonDocument doc;
  doc["temperature"] = temperature;
  doc["humidity"] = humidity;
  doc["airQuality"] = airQuality;
  doc["light"] = light;
  doc["sound"] = sound;

  String body;
  serializeJson(doc, body);

  String url = String(BACKEND_URL) + "/enclosures/" + ENCLOSURE_ID + "/readings";

  HTTPClient http;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", API_KEY);

  int statusCode = http.POST(body);
  Serial.printf("POST %s -> %d\n", url.c_str(), statusCode);
  if (statusCode > 0) {
    Serial.println(http.getString());
  }
  http.end();
}

void loop() {
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();
  int airQuality = analogRead(MQ135_PIN);
  int light = analogRead(LDR_PIN);
  int sound = analogRead(SOUND_PIN);

  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("DHT22 read failed, skipping this cycle.");
  } else {
    Serial.printf(
        "temp=%.1fC humidity=%.1f%% airQuality=%d light=%d sound=%d\n",
        temperature, humidity, airQuality, light, sound);
    postReading(temperature, humidity, airQuality, light, sound);
  }

  delay(POST_INTERVAL_MS);
}
