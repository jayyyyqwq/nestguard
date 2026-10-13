"""
The three NestGuard sensor boxes and the safe ranges for the animals they watch.

NestGuard ships exactly three ESP32 boxes, one per enclosure type, each with a
fixed ID flashed into its firmware (firmware/nestguard/nestguard.ino,
ENCLOSURE_ID). An enclosure can only be registered under one of these IDs.

Temperature limits differ per animal: a healthy brood nest runs at ~35°C,
which would already be heat stress for chickens or rabbits.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class Limits:
    attention: float
    critical: float


@dataclass(frozen=True)
class Device:
    id: str
    kind: str  # beehive | coop | shelter
    label: str
    temperature: Limits


# Raw MQ-135 analog readings (ESP32 ADC range 0-4095), shared by every box.
# Placeholder numbers: calibrate once the real sensor is wired up and you can
# see what clean air actually reads as at your site.
AIR_QUALITY = Limits(attention=1800, critical=2600)

DEVICES: dict[str, Device] = {
    d.id: d
    for d in [
        # Brood nest is kept at 34-36°C by the bees; above ~37°C brood is damaged.
        Device("HIVE1", "beehive", "Beehive", Limits(attention=37.0, critical=39.0)),
        # Chickens start panting above ~30°C; 35°C+ is dangerous.
        Device("COOP1", "coop", "Chicken coop", Limits(attention=30.0, critical=35.0)),
        # Rabbits and similar small livestock: heat stress from ~28°C.
        Device("SHED1", "shelter", "Livestock shelter", Limits(attention=28.0, critical=32.0)),
    ]
}
