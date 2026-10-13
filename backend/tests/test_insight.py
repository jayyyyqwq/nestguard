import pytest

from app.devices import DEVICES
from app.insight import compute_insight


def _status(device_id: str, temperature: float, air_quality: float = 700, elapsed: float = 10) -> str:
    return compute_insight(
        device=DEVICES[device_id], temperature=temperature, air_quality=air_quality, elapsed_seconds=elapsed
    ).status


def test_normal_brood_temperature_is_healthy_for_bees_but_critical_for_chickens():
    assert _status("HIVE1", 35.0) == "healthy"
    assert _status("COOP1", 35.0) == "critical"


@pytest.mark.parametrize(
    ("device_id", "temperature", "expected"),
    [
        ("HIVE1", 36.9, "healthy"),
        ("HIVE1", 37.0, "attention"),
        ("HIVE1", 39.0, "critical"),
        ("COOP1", 29.9, "healthy"),
        ("COOP1", 30.0, "attention"),
        ("SHED1", 28.0, "attention"),
        ("SHED1", 32.0, "critical"),
    ],
)
def test_temperature_limits_per_animal(device_id: str, temperature: float, expected: str):
    assert _status(device_id, temperature) == expected


def test_air_quality_limits_apply_to_every_box():
    assert _status("HIVE1", 34.0, air_quality=1800) == "attention"
    assert _status("SHED1", 20.0, air_quality=2600) == "critical"


def test_offline_beats_everything():
    insight = compute_insight(device=DEVICES["COOP1"], temperature=40.0, air_quality=700, elapsed_seconds=301)
    assert insight.status == "critical"
    assert "offline" in insight.reason


def test_never_reported_is_waiting_not_an_alarm():
    assert _status("COOP1", 0.0, elapsed=float("inf")) == "waiting"
