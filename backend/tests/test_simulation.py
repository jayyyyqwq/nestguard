from app import simulation
from app.devices import DEVICES
from app.insight import compute_insight


def _statuses(device_id: str) -> list[str]:
    device = DEVICES[device_id]
    statuses = []
    for step in range(41):
        reading = simulation.scripted_reading(device.kind, step / 40)
        insight = compute_insight(
            device=device, temperature=reading.temperature, air_quality=reading.air_quality, elapsed_seconds=0
        )
        statuses.append(insight.status)
    return statuses


def test_coop_overheats_to_critical_then_recovers():
    statuses = _statuses("COOP1")
    assert statuses[0] == "healthy"
    assert "attention" in statuses
    assert "critical" in statuses
    assert statuses[-1] == "healthy"


def test_hive_air_goes_bad_then_recovers_while_temperature_stays_healthy():
    statuses = _statuses("HIVE1")
    assert statuses[0] == "healthy"
    assert "attention" in statuses
    assert statuses[-1] == "healthy"


def test_shelter_stays_healthy_throughout():
    assert set(_statuses("SHED1")) == {"healthy"}


def test_tick_feeds_every_registered_enclosure_through_ingestion(client):
    simulation.tick(0.45)  # coop at peak heat

    coop = client.get("/enclosures/COOP1").json()
    assert coop["status"] == "critical"
    assert len(coop["trend"]) == 1
    assert client.get("/enclosures/COOP1/alerts").json()[0]["kind"] == "critical"


def test_status_when_idle(client):
    body = client.get("/simulation").json()
    assert body == {"running": False, "progress": 0.0, "elapsedSeconds": 0, "durationSeconds": 120, "phase": ""}


def test_start_and_stop_require_api_key(client):
    assert client.post("/simulation/start").status_code == 401
    assert client.post("/simulation/stop").status_code == 401


def test_phase_covers_whole_scenario():
    assert simulation.phase(0.0).startswith("Baseline")
    assert simulation.phase(1.0).startswith("All clear")


def test_reset_to_waiting_wipes_simulated_data_but_keeps_registrations(client):
    simulation.tick(0.45)
    simulation.reset_to_waiting()

    coop = client.get("/enclosures/COOP1").json()
    assert coop["status"] == "waiting"
    assert coop["temperature"] == 0
    assert coop["trend"] == []
    assert client.get("/enclosures/COOP1/alerts").json() == []


def test_stop_without_a_run_leaves_data_alone(client):
    simulation.tick(0.0)
    simulation.stop()

    assert client.get("/enclosures/COOP1").json()["status"] == "healthy"
