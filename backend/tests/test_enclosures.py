from app.auth import API_KEY

AUTH_HEADERS = {"X-API-Key": API_KEY}

READING = {
    "temperature": 24.0,
    "humidity": 50.0,
    "airQuality": 700,
    "light": 300,
    "sound": 500,
}


def test_ingest_reading_updates_live_values_and_trend(client):
    res = client.post("/enclosures/COOP1/readings", json=READING, headers=AUTH_HEADERS)
    assert res.status_code == 200
    body = res.json()
    assert body["temperature"] == 24.0
    assert body["status"] == "healthy"
    assert body["kind"] == "coop"
    assert body["limits"]["temperature"] == {"attention": 30.0, "critical": 35.0}
    assert len(body["trend"]) == 1


def test_ingest_reading_requires_api_key(client):
    res = client.post("/enclosures/COOP1/readings", json=READING)
    assert res.status_code == 401


def test_ingest_reading_unknown_enclosure_returns_404(client):
    res = client.post("/enclosures/does-not-exist/readings", json=READING, headers=AUTH_HEADERS)
    assert res.status_code == 404


def test_critical_reading_opens_alert_and_recovery_resolves_it(client):
    critical = {**READING, "temperature": 36.0}
    res = client.post("/enclosures/COOP1/readings", json=critical, headers=AUTH_HEADERS)
    assert res.json()["status"] == "critical"

    alerts = client.get("/enclosures/COOP1/alerts").json()
    assert len(alerts) == 1
    assert alerts[0]["resolved"] is False
    assert alerts[0]["kind"] == "critical"

    res = client.post("/enclosures/COOP1/readings", json=READING, headers=AUTH_HEADERS)
    assert res.json()["status"] == "healthy"

    alerts = client.get("/enclosures/COOP1/alerts").json()
    assert alerts[0]["resolved"] is True


def test_escalation_resolves_previous_alert(client):
    client.post("/enclosures/COOP1/readings", json={**READING, "temperature": 31.0}, headers=AUTH_HEADERS)
    client.post("/enclosures/COOP1/readings", json={**READING, "temperature": 36.0}, headers=AUTH_HEADERS)

    alerts = client.get("/enclosures/COOP1/alerts").json()
    assert [(a["kind"], a["resolved"]) for a in alerts] == [("critical", False), ("attention", True)]


def test_create_enclosure_success_defaults_name_to_device_label(client):
    res = client.post("/enclosures", json={"id": "HIVE1"}, headers=AUTH_HEADERS)
    assert res.status_code == 201
    body = res.json()
    assert body["id"] == "HIVE1"
    assert body["name"] == "Beehive"
    assert body["kind"] == "beehive"
    assert body["status"] == "waiting"
    assert body["isOffline"] is False
    assert body["lastSynced"] == "never"


def test_create_enclosure_keeps_custom_name(client):
    res = client.post("/enclosures", json={"id": "SHED1", "name": "  Rabbit hutch "}, headers=AUTH_HEADERS)
    assert res.json()["name"] == "Rabbit hutch"


def test_create_enclosure_rejects_unknown_box_id(client):
    res = client.post("/enclosures", json={"id": "E999", "name": "Nope"}, headers=AUTH_HEADERS)
    assert res.status_code == 422


def test_create_enclosure_rejects_duplicate_id(client):
    res = client.post("/enclosures", json={"id": "COOP1"}, headers=AUTH_HEADERS)
    assert res.status_code == 409


def test_create_enclosure_requires_api_key(client):
    res = client.post("/enclosures", json={"id": "HIVE1"})
    assert res.status_code == 401
