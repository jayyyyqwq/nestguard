/*
 * NestGuard: ESP32 sensor box firmware (plug and play)
 *
 * Reads DHT22 (temperature/humidity), MQ-135 (air quality), LDR (light) and a
 * sound sensor, and POSTs a JSON reading to the NestGuard laptop every
 * POST_INTERVAL_MS.
 *
 * Nothing about the network is hard-coded:
 *   - Wi-Fi: on first start, or when no saved Wi-Fi is in range, the box opens
 *     its own hotspot "NestGuard-<ENCLOSURE_ID>". Join it from a phone, pick
 *     the Wi-Fi, type the password; the box remembers it. Holding the BOOT
 *     button for 5 seconds forgets the saved Wi-Fi and reopens the hotspot.
 *   - Laptop: the box broadcasts "NESTGUARD_DISCOVER <nonce>" on UDP
 *     DISCOVERY_PORT and whichever laptop runs NestGuard answers
 *     (backend/app/discovery.py) with an HMAC-SHA256 proof keyed by API_KEY.
 *     Answers whose proof doesn't check out are ignored, so another device on
 *     the Wi-Fi can't pose as NestGuard and collect readings or the key.
 *     If posting fails a few times in a row, it searches again, so switching
 *     laptops or a new laptop IP sorts itself out.
 *
 * NOT FLASH-TESTED: there was no physical ESP32 available when this was
 * written. See docs/HARDWARE_GUIDE.md for wiring and setup.
 *
 * Libraries (Arduino IDE > Tools > Manage Libraries):
 *   - "DHT sensor library" by Adafruit (accept "Adafruit Unified Sensor")
 *   - "ArduinoJson" by Benoit Blanchon, version 7+
 *   - "WiFiManager" by tzapu, version 2+
 * Board support: Boards Manager > "esp32" by Espressif Systems.
 *
 * Wiring (ESP32 ADC1 pins only; ADC2 conflicts with Wi-Fi):
 *   DHT22 data   -> GPIO4
 *   MQ-135 AOUT  -> GPIO34 through a 10k / 20k voltage divider (the module runs
 *                   on 5V from VIN, and its output can exceed the ESP32's 3.3V)
 *   LDR AOUT     -> GPIO35
 *   Sound AOUT   -> GPIO32
 *   DHT22, LDR, sound VCC -> 3V3. MQ-135 VCC -> VIN (5V). All GND -> GND.
 */

#include <WiFi.h>
#include <WiFiUdp.h>
#include <WiFiManager.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include "mbedtls/md.h"  // HMAC, part of the ESP32 board package

// ---- Set once per box, before uploading ----
const char *ENCLOSURE_ID = "COOP1";     // HIVE1, COOP1 or SHED1
const char *API_KEY = "dev-local-key";  // must match backend/.env's API_KEY
// Leave empty so the box finds the laptop by itself. Only fill in, e.g.
// "http://192.168.137.1:8000", on networks that block discovery.
const char *FIXED_BACKEND_URL = "";
// ---------------------------------------------

#define DHT_PIN 4
#define DHT_TYPE DHT22
#define MQ135_PIN 34
#define LDR_PIN 35
#define SOUND_PIN 32
#define BOOT_PIN 0

#define POST_INTERVAL_MS 30000
#define DISCOVERY_PORT 47800
#define DISCOVERY_TIMEOUT_MS 2000
#define RETRY_DELAY_MS 5000
#define MAX_FAILED_POSTS 3
#define WIFI_RESET_HOLD_MS 5000
#define SETUP_HOTSPOT_TIMEOUT_S 180  // then restart and try the saved Wi-Fi again

DHT dht(DHT_PIN, DHT_TYPE);
WiFiUDP udp;

String backendUrl;  // "http://<laptop ip>:<port>", empty until discovered
int failedPosts = 0;
unsigned long lastPostAt = 0;
bool hasPosted = false;
unsigned long bootPressedAt = 0;

void connectWiFi() {
  WiFiManager wm;
  wm.setConfigPortalTimeout(SETUP_HOTSPOT_TIMEOUT_S);
  String hotspot = String("NestGuard-") + ENCLOSURE_ID;
  Serial.printf("Joining saved Wi-Fi, or opening setup hotspot \"%s\"...\n", hotspot.c_str());
  if (!wm.autoConnect(hotspot.c_str())) {
    Serial.println("No Wi-Fi set up in time. Restarting to try again.");
    ESP.restart();
  }
  Serial.printf("Connected to \"%s\", box IP: %s\n", WiFi.SSID().c_str(), WiFi.localIP().toString().c_str());
}

// Hex HMAC-SHA256 of message, keyed with API_KEY. Must match discovery.proof().
String hmacHex(const String &message) {
  unsigned char digest[32];
  mbedtls_md_context_t ctx;
  mbedtls_md_init(&ctx);
  mbedtls_md_setup(&ctx, mbedtls_md_info_from_type(MBEDTLS_MD_SHA256), 1);
  mbedtls_md_hmac_starts(&ctx, (const unsigned char *)API_KEY, strlen(API_KEY));
  mbedtls_md_hmac_update(&ctx, (const unsigned char *)message.c_str(), message.length());
  mbedtls_md_hmac_finish(&ctx, digest);
  mbedtls_md_free(&ctx);

  char hex[65];
  for (int i = 0; i < 32; i++) sprintf(hex + 2 * i, "%02x", digest[i]);
  return String(hex);
}

// Asks the network where NestGuard is. True once backendUrl is set.
bool discoverBackend() {
  if (strlen(FIXED_BACKEND_URL) > 0) {
    backendUrl = FIXED_BACKEND_URL;
    return true;
  }

  // Fresh random nonce per search, so an old answer can't be replayed.
  char nonce[17];
  snprintf(nonce, sizeof(nonce), "%08lx%08lx", (unsigned long)esp_random(), (unsigned long)esp_random());

  Serial.println("Looking for the NestGuard laptop...");
  udp.beginPacket(WiFi.broadcastIP(), DISCOVERY_PORT);
  udp.print("NESTGUARD_DISCOVER ");
  udp.print(nonce);
  udp.endPacket();

  unsigned long start = millis();
  while (millis() - start < DISCOVERY_TIMEOUT_MS) {
    if (udp.parsePacket() > 0) {
      char reply[128];
      int len = udp.read(reply, sizeof(reply) - 1);
      reply[len > 0 ? len : 0] = '\0';

      int port = 0;
      char proof[65] = {0};
      if (sscanf(reply, "NESTGUARD_HERE %d %64s", &port, proof) == 2) {
        String sender = udp.remoteIP().toString();
        String expected = hmacHex(String(nonce) + ":" + String(port) + ":" + sender);
        if (expected.equals(proof)) {
          backendUrl = "http://" + sender + ":" + String(port);
          Serial.printf("Found NestGuard at %s\n", backendUrl.c_str());
          return true;
        }
        Serial.printf("Ignored an answer from %s that failed verification (wrong API_KEY?)\n", sender.c_str());
      }
    }
    delay(10);
  }
  Serial.println("No NestGuard laptop answered. Is run.bat / run.sh running on a laptop on this Wi-Fi?");
  return false;
}

// Holding BOOT for WIFI_RESET_HOLD_MS forgets the Wi-Fi and reopens the setup hotspot.
void checkWiFiResetButton() {
  if (digitalRead(BOOT_PIN) != LOW) {
    bootPressedAt = 0;
    return;
  }
  if (bootPressedAt == 0) {
    bootPressedAt = millis();
  } else if (millis() - bootPressedAt >= WIFI_RESET_HOLD_MS) {
    Serial.println("BOOT held: forgetting saved Wi-Fi and restarting into setup mode.");
    WiFiManager wm;
    wm.resetSettings();
    delay(500);
    ESP.restart();
  }
}

int postReading(float temperature, float humidity, int airQuality, int light, int sound) {
  JsonDocument doc;
  doc["temperature"] = temperature;
  doc["humidity"] = humidity;
  doc["airQuality"] = airQuality;
  doc["light"] = light;
  doc["sound"] = sound;

  String body;
  serializeJson(doc, body);

  String url = backendUrl + "/enclosures/" + ENCLOSURE_ID + "/readings";
  HTTPClient http;
  http.setTimeout(5000);
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", API_KEY);

  int statusCode = http.POST(body);
  Serial.printf("POST %s -> %d\n", url.c_str(), statusCode);
  http.end();
  return statusCode;
}

void readAndPost() {
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();
  int airQuality = analogRead(MQ135_PIN);
  int light = analogRead(LDR_PIN);
  int sound = analogRead(SOUND_PIN);

  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("DHT22 read failed, skipping this cycle. Check the DHT22 wiring (data -> GPIO4).");
    return;
  }
  Serial.printf("temp=%.1fC humidity=%.1f%% airQuality=%d light=%d sound=%d\n",
                temperature, humidity, airQuality, light, sound);

  int statusCode = postReading(temperature, humidity, airQuality, light, sound);
  if (statusCode > 0) {
    failedPosts = 0;
    if (statusCode == 404) Serial.println("This box isn't registered: register it on the dashboard.");
    if (statusCode == 401) Serial.println("API key mismatch with backend/.env.");
  } else if (++failedPosts >= MAX_FAILED_POSTS) {
    Serial.println("Laptop unreachable, searching for NestGuard again.");
    backendUrl = "";
    failedPosts = 0;
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(BOOT_PIN, INPUT_PULLUP);
  dht.begin();
  Serial.printf("\nNestGuard box %s starting\n", ENCLOSURE_ID);
  connectWiFi();
  udp.begin(DISCOVERY_PORT);
}

void loop() {
  checkWiFiResetButton();

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Wi-Fi dropped, reconnecting...");
    WiFi.reconnect();
    delay(RETRY_DELAY_MS);
    return;
  }

  if (backendUrl.isEmpty() && !discoverBackend()) {
    delay(RETRY_DELAY_MS);
    return;
  }

  if (hasPosted && millis() - lastPostAt < POST_INTERVAL_MS) {
    delay(50);
    return;
  }
  lastPostAt = millis();
  hasPosted = true;
  readAndPost();
}
