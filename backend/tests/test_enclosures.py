from app.auth import API_KEY

AUTH_HEADERS = {"X-API-Key": API_KEY}

READING = {
    "temperature": 30.0,
    "humidity": 50.0,
    "airQuality": 700,
    "light": 300,
    "sound": 500,
}


def test_ingest_reading_updates_live_values_and_trend(client):
    res = client.post("/enclosures/E001/readings", json=READING, headers=AUTH_HEADERS)
    assert res.status_code == 200
    body = res.json()
    assert body["temperature"] == 30.0
    assert body["status"] == "healthy"
    assert len(body["trend"]) >= 1


def test_ingest_reading_requires_api_key(client):
    res = client.post("/enclosures/E001/readings", json=READING)
    assert res.status_code == 401


def test_ingest_reading_unknown_enclosure_returns_404(client):
    res = client.post("/enclosures/does-not-exist/readings", json=READING, headers=AUTH_HEADERS)
    assert res.status_code == 404


def test_critical_reading_opens_alert_and_recovery_resolves_it(client):
    critical = {**READING, "temperature": 39.0}
    res = client.post("/enclosures/E001/readings", json=critical, headers=AUTH_HEADERS)
    assert res.status_code == 200
    assert res.json()["status"] == "critical"

    alerts = client.get("/enclosures/E001/alerts").json()
    assert len(alerts) == 1
    assert alerts[0]["resolved"] is False
    assert alerts[0]["kind"] == "critical"

    res = client.post("/enclosures/E001/readings", json=READING, headers=AUTH_HEADERS)
    assert res.json()["status"] == "healthy"

    alerts = client.get("/enclosures/E001/alerts").json()
    assert alerts[0]["resolved"] is True


def test_create_enclosure_success(client):
    res = client.post("/enclosures", json={"id": "E999", "name": "Test Enclosure"}, headers=AUTH_HEADERS)
    assert res.status_code == 201
    body = res.json()
    assert body["id"] == "E999"
    assert body["isOffline"] is True
    assert body["lastSynced"] == "never"


def test_create_enclosure_rejects_duplicate_id(client):
    res = client.post("/enclosures", json={"id": "E001", "name": "Duplicate"}, headers=AUTH_HEADERS)
    assert res.status_code == 409


def test_create_enclosure_requires_api_key(client):
    res = client.post("/enclosures", json={"id": "E998", "name": "No Key"})
    assert res.status_code == 401
