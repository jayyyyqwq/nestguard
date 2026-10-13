from app.auth import API_KEY

AUTH_HEADERS = {"X-API-Key": API_KEY}
HOT = {"temperature": 36.0, "humidity": 50, "airQuality": 700, "light": 300, "sound": 500}


def test_devices_lists_all_three_boxes_with_registration_state(client):
    devices = client.get("/devices").json()
    assert [(d["id"], d["kind"], d["registered"]) for d in devices] == [
        ("HIVE1", "beehive", False),
        ("COOP1", "coop", True),
        ("SHED1", "shelter", False),
    ]


def test_recent_alerts_across_enclosures_newest_first(client):
    client.post("/enclosures", json={"id": "HIVE1"}, headers=AUTH_HEADERS)
    client.post("/enclosures/COOP1/readings", json=HOT, headers=AUTH_HEADERS)
    client.post("/enclosures/HIVE1/readings", json={**HOT, "airQuality": 2000}, headers=AUTH_HEADERS)

    alerts = client.get("/alerts").json()
    assert [a["enclosureId"] for a in alerts] == ["HIVE1", "COOP1"]


def test_recent_alerts_limit_is_bounded(client):
    assert client.get("/alerts?limit=0").status_code == 422
