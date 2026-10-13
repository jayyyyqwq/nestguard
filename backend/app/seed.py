"""
Registers the beehive and chicken coop boxes with no readings, so the
dashboard starts empty ("waiting for first reading") until a real ESP32
posts or the simulation runs. The livestock shelter is left unregistered,
to register from the UI.

Run with: python -m app.seed          (skips if already seeded)
          python -m app.seed --reset  (wipes all data and starts over)
"""

import sys

from app.database import Base, SessionLocal, engine
from app.devices import DEVICES
from app.models import Enclosure

PREREGISTERED = ["HIVE1", "COOP1"]


def seed(reset: bool = False) -> None:
    if reset:
        Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        existing = {row.id for row in db.query(Enclosure.id)}
        if existing - set(DEVICES):
            print(
                f"Database holds enclosures from an older version ({', '.join(sorted(existing - set(DEVICES)))}).\n"
                "Run `python -m app.seed --reset` to start over."
            )
            sys.exit(1)
        if existing:
            print("Already set up, skipping. Use --reset to start over.")
            return

        db.add_all(Enclosure(id=device_id, name=DEVICES[device_id].label) for device_id in PREREGISTERED)
        db.commit()
        print(f"Registered {' and '.join(PREREGISTERED)} with no readings yet.")
    finally:
        db.close()


if __name__ == "__main__":
    seed(reset="--reset" in sys.argv)
