"""
Rule-based enclosure health insight — computed live from sensor readings.

Not a trained model: there's no labeled failure dataset for these enclosures
to train one on, so this encodes simple temperature/air-quality thresholds
an owner would check manually. It's real in the sense that it reacts to the
actual numbers (change an enclosure's readings, the insight changes with it)
rather than being fixed prose per enclosure. A trained model is a drop-in
replacement later — nothing else in the app needs to change, callers only
see `status` / `reason` / `action`.
"""

from dataclasses import dataclass

OFFLINE_THRESHOLD_S = 300  # 5 min — a couple of missed 30-60s POST cycles before flagging offline

HIGH_TEMP_C = 35.0
CRITICAL_TEMP_C = 38.0

# Raw MQ-135 analog readings (ESP32 ADC range 0-4095). Placeholder numbers —
# calibrate once the real sensor is wired up and you can see what clean air
# actually reads as at your site.
HIGH_AIR_QUALITY = 1800
CRITICAL_AIR_QUALITY = 2600

# Raw sound-sensor analog readings (same 0-4095 range). Placeholder, same
# calibrate-later caveat as air quality.
LOW_SOUND = 800
HIGH_SOUND = 2500


@dataclass(frozen=True)
class Insight:
    status: str  # healthy | attention | critical
    reason: str
    action: str


def compute_insight(*, temperature: float, air_quality: float, elapsed_seconds: float) -> Insight:
    if elapsed_seconds == float("inf"):
        return Insight(
            status="critical",
            reason="No data received yet — device likely offline.",
            action="Check ESP32 power and Wi-Fi connection at the enclosure.",
        )

    if elapsed_seconds >= OFFLINE_THRESHOLD_S:
        minutes = int(elapsed_seconds // 60)
        return Insight(
            status="critical",
            reason=f"No data received in over {minutes} minutes — device likely offline.",
            action="Check ESP32 power and Wi-Fi connection at the enclosure.",
        )

    if temperature >= CRITICAL_TEMP_C:
        return Insight(
            status="critical",
            reason=f"Temperature critically high at {temperature:.1f}°C.",
            action="Inspect immediately — risk of overheating.",
        )

    if air_quality >= CRITICAL_AIR_QUALITY:
        return Insight(
            status="critical",
            reason=f"Air quality critically poor (reading {air_quality:.0f}).",
            action="Ventilate immediately — possible gas or ammonia buildup.",
        )

    if temperature >= HIGH_TEMP_C:
        return Insight(
            status="attention",
            reason=f"Temperature elevated at {temperature:.1f}°C.",
            action="Check ventilation within a few hours.",
        )

    if air_quality >= HIGH_AIR_QUALITY:
        return Insight(
            status="attention",
            reason=f"Air quality declining (reading {air_quality:.0f}).",
            action="Check ventilation within a few hours.",
        )

    return Insight(
        status="healthy",
        reason="All readings within normal range.",
        action="No action needed — continue routine checks.",
    )


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
