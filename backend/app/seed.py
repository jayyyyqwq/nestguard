"""
Loads sample enclosure + sensor-reading history into the database, so the
API returns something meaningful before real ESP32 devices are wired up.

Run with: python -m app.seed
"""

from datetime import datetime, timedelta

from app.database import Base, SessionLocal, engine
from app.models import Enclosure, SensorReading


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(Enclosure).count() > 0:
            print("Already seeded — skipping. Delete honeychain.db to reseed.")
            return

        now = datetime.now()

        enclosures_data = [
            dict(
                id="E101", name="Enclosure E101", synced_ago=timedelta(minutes=2),
                # (temperature, humidity, air_quality, light, sound) history, oldest first
                history=[
                    (31.2, 55, 700, 310, 420),
                    (32.1, 56, 720, 300, 440),
                    (33.8, 57, 780, 295, 460),
                    (34.2, 58, 800, 300, 400),
                    (33.4, 58, 800, 300, 400),
                ],
            ),
            dict(
                id="E102", name="Enclosure E102", synced_ago=timedelta(minutes=5),
                history=[
                    (32.0, 59, 1000, 290, 1500),
                    (33.4, 60, 1080, 285, 1550),
                    (34.9, 60, 1150, 280, 1600),
                    (35.6, 61, 1200, 280, 1600),
                    (35.8, 61, 1200, 280, 1600),
                ],
            ),
            dict(
                id="E103", name="Enclosure E103", synced_ago=timedelta(minutes=1),
                history=[
                    (29.8, 53, 650, 330, 480),
                    (30.6, 54, 670, 325, 490),
                    (31.5, 55, 690, 322, 500),
                    (31.8, 55, 700, 320, 500),
                    (31.2, 55, 700, 320, 500),
                ],
            ),
            dict(
                id="E104", name="Enclosure E104", synced_ago=timedelta(hours=7),
                history=[
                    (28.0, 64, 850, 210, 310),
                    (27.6, 63, 870, 205, 300),
                    (27.1, 63, 900, 200, 300),
                    (27.1, 63, 900, 200, 300),
                ],
            ),
        ]

        for e in enclosures_data:
            history = e.pop("history")
            synced_ago = e.pop("synced_ago")
            last_synced_at = now - synced_ago
            temperature, humidity, air_quality, light, sound = history[-1]

            enclosure = Enclosure(
                id=e["id"],
                name=e["name"],
                temperature=temperature,
                humidity=humidity,
                air_quality=air_quality,
                light=light,
                sound=sound,
                last_synced_at=last_synced_at,
            )

            step = timedelta(hours=1)
            start = last_synced_at - step * (len(history) - 1)
            enclosure.readings = [
                SensorReading(
                    temperature=temp, humidity=hum, air_quality=aq, light=light_v, sound=sound_v,
                    created_at=start + step * i,
                )
                for i, (temp, hum, aq, light_v, sound_v) in enumerate(history)
            ]
            db.add(enclosure)

        db.commit()
        print("Seeded database with sample enclosure data.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
