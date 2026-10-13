"""Reading ingestion and live status, shared by the HTTP API and the simulator."""

from datetime import datetime

from sqlalchemy.orm import Session

from app import models, schemas
from app.devices import AIR_QUALITY, DEVICES
from app.insight import OFFLINE_THRESHOLD_S, Insight, compute_insight, derive_activity, humanize_elapsed


def _elapsed(enclosure: models.Enclosure, now: datetime) -> float:
    if enclosure.last_synced_at is None:
        return float("inf")
    return (now - enclosure.last_synced_at).total_seconds()


def _insight(enclosure: models.Enclosure, elapsed_seconds: float) -> Insight:
    return compute_insight(
        device=DEVICES[enclosure.id],
        temperature=enclosure.temperature,
        air_quality=enclosure.air_quality,
        elapsed_seconds=elapsed_seconds,
    )


def with_live_insight(enclosure: models.Enclosure) -> models.Enclosure:
    """Sets the computed (non-persisted) fields EnclosureOut needs as plain
    instance attributes. The request's DB session is never committed here."""
    elapsed = _elapsed(enclosure, datetime.now())
    insight = _insight(enclosure, elapsed)
    device = DEVICES[enclosure.id]
    enclosure.kind = device.kind
    enclosure.label = device.label
    enclosure.limits = {"temperature": device.temperature, "air_quality": AIR_QUALITY}
    enclosure.status = insight.status
    enclosure.ai_reason = insight.reason
    enclosure.ai_action = insight.action
    # A box that has never reported is "waiting", not offline.
    enclosure.is_offline = OFFLINE_THRESHOLD_S <= elapsed < float("inf")
    enclosure.last_synced = humanize_elapsed(elapsed)
    enclosure.activity = derive_activity(enclosure.sound)
    return enclosure


def record_reading(db: Session, enclosure: models.Enclosure, reading: schemas.ReadingIn) -> None:
    """Stores a reading, updates the enclosure's live values, and opens or
    resolves alerts when its status changes. Commits."""
    now = datetime.now()
    previous = _insight(enclosure, _elapsed(enclosure, now))

    db.add(models.SensorReading(enclosure_id=enclosure.id, created_at=now, **reading.model_dump()))
    enclosure.temperature = reading.temperature
    enclosure.humidity = reading.humidity
    enclosure.air_quality = reading.air_quality
    enclosure.light = reading.light
    enclosure.sound = reading.sound
    enclosure.last_synced_at = now

    current = _insight(enclosure, 0)
    if current.status != previous.status:
        # Status changed: whatever was open no longer describes the enclosure.
        db.query(models.Alert).filter_by(enclosure_id=enclosure.id, resolved=False).update({"resolved": True})
        if current.status != "healthy":
            db.add(
                models.Alert(enclosure_id=enclosure.id, kind=current.status, message=current.reason, created_at=now)
            )

    db.commit()
