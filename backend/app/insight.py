"""
Rule-based enclosure health insight, computed live from sensor readings.

Not a trained model: there's no labeled failure dataset for these enclosures
to train one on, so this encodes the temperature/air-quality limits an owner
would check by hand, per animal (see app/devices.py). It reacts to the actual
numbers rather than being fixed prose per enclosure. A trained model is a
drop-in replacement later: callers only see `status` / `reason` / `action`.
"""

from dataclasses import dataclass

from app.devices import AIR_QUALITY, Device

OFFLINE_THRESHOLD_S = 300  # 5 min: a few missed 30-60s POST cycles before flagging offline

# Raw sound-sensor analog readings (ESP32 ADC range 0-4095). Placeholder,
# calibrate once the real sensor is wired up.
LOW_SOUND = 800
HIGH_SOUND = 2500

OFFLINE_ACTION = "Check the ESP32's power and Wi-Fi at the enclosure."

HEAT_ACTION = {
    "beehive": "Shade the hive and open the top vent; brood is at risk above 37°C.",
    "coop": "Open vents, add shade and cool water; chickens can't sweat.",
    "shelter": "Move animals to shade and improve airflow; rabbits overheat fast.",
}


@dataclass(frozen=True)
class Insight:
    status: str  # waiting | healthy | attention | critical
    reason: str
    action: str


def compute_insight(
    *, device: Device, temperature: float, air_quality: float, elapsed_seconds: float
) -> Insight:
    if elapsed_seconds == float("inf"):
        return Insight(
            "waiting", "No readings yet.", "Power on the box, or press Run simulation to see a demo."
        )

    if elapsed_seconds >= OFFLINE_THRESHOLD_S:
        minutes = int(elapsed_seconds // 60)
        return Insight("critical", f"No data for {minutes} minutes, the box is likely offline.", OFFLINE_ACTION)

    limits = device.temperature
    if temperature >= limits.critical:
        return Insight(
            "critical",
            f"Temperature critically high at {temperature:.1f}°C (limit {limits.critical:.0f}°C).",
            f"Act now. {HEAT_ACTION[device.kind]}",
        )

    if air_quality >= AIR_QUALITY.critical:
        return Insight(
            "critical",
            f"Air quality critically poor (reading {air_quality:.0f}).",
            "Ventilate now: likely ammonia or gas buildup. Clean out bedding.",
        )

    if temperature >= limits.attention:
        return Insight(
            "attention",
            f"Temperature rising at {temperature:.1f}°C (comfortable below {limits.attention:.0f}°C).",
            f"Check within a few hours. {HEAT_ACTION[device.kind]}",
        )

    if air_quality >= AIR_QUALITY.attention:
        return Insight(
            "attention",
            f"Air quality declining (reading {air_quality:.0f}).",
            "Improve ventilation within a few hours.",
        )

    return Insight("healthy", "All readings within the safe range.", "Nothing to do. Routine checks only.")


def derive_activity(sound: float) -> str:
    if sound >= HIGH_SOUND:
        return "High"
    if sound <= LOW_SOUND:
        return "Low"
    return "Normal"


def humanize_elapsed(seconds: float) -> str:
    if seconds == float("inf"):
        return "never"
    if seconds < 90:
        return "just now"
    minutes = int(seconds // 60)
    if minutes < 60:
        return f"{minutes} minute{'s' if minutes != 1 else ''} ago"
    hours = minutes // 60
    return f"{hours} hour{'s' if hours != 1 else ''} ago"
