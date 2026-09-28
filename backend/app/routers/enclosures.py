from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import require_api_key
from app.database import get_db
from app.insight import compute_insight, derive_activity, humanize_elapsed

router = APIRouter(prefix="/enclosures", tags=["enclosures"])


def _with_live_insight(enclosure: models.Enclosure) -> models.Enclosure:
    """Sets status/ai_reason/ai_action/is_offline/last_synced/activity as
    plain instance attributes, computed live from stored sensor values and
    elapsed time since last_synced_at. Not persisted — the request's DB
    session is never committed here."""
    elapsed = (
        (datetime.now() - enclosure.last_synced_at).total_seconds()
        if enclosure.last_synced_at
        else float("inf")
    )
    insight = compute_insight(
        temperature=enclosure.temperature,
        air_quality=enclosure.air_quality,
        elapsed_seconds=elapsed,
    )
    enclosure.status = insight.status
    enclosure.ai_reason = insight.reason
    enclosure.ai_action = insight.action
    enclosure.is_offline = elapsed >= 300  # OFFLINE_THRESHOLD_S
    enclosure.last_synced = humanize_elapsed(elapsed)
    enclosure.activity = derive_activity(enclosure.sound)
    return enclosure


@router.get("", response_model=list[schemas.EnclosureOut])
def list_enclosures(db: Session = Depends(get_db)):
    return [_with_live_insight(enclosure) for enclosure in db.query(models.Enclosure).all()]


@router.post("", response_model=schemas.EnclosureOut, status_code=201, dependencies=[Depends(require_api_key)])
def create_enclosure(payload: schemas.EnclosureCreate, db: Session = Depends(get_db)):
    if db.get(models.Enclosure, payload.id):
        raise HTTPException(status_code=409, detail="Enclosure with this ID already exists")
    enclosure = models.Enclosure(id=payload.id, name=payload.name)
    db.add(enclosure)
    db.commit()
    db.refresh(enclosure)
    return _with_live_insight(enclosure)


@router.get("/{enclosure_id}", response_model=schemas.EnclosureOut)
def get_enclosure(enclosure_id: str, db: Session = Depends(get_db)):
    enclosure = db.get(models.Enclosure, enclosure_id)
    if not enclosure:
        raise HTTPException(status_code=404, detail="Enclosure not found")
    return _with_live_insight(enclosure)


@router.post(
    "/{enclosure_id}/readings",
    response_model=schemas.EnclosureOut,
    dependencies=[Depends(require_api_key)],
)
def ingest_reading(enclosure_id: str, payload: schemas.ReadingIn, db: Session = Depends(get_db)):
    enclosure = db.get(models.Enclosure, enclosure_id)
    if not enclosure:
        raise HTTPException(status_code=404, detail="Enclosure not found")

    now = datetime.now()
    db.add(
        models.SensorReading(
            enclosure_id=enclosure_id,
            temperature=payload.temperature,
            humidity=payload.humidity,
            air_quality=payload.air_quality,
            light=payload.light,
            sound=payload.sound,
            created_at=now,
        )
    )

    previous_insight = compute_insight(
        temperature=enclosure.temperature,
        air_quality=enclosure.air_quality,
        elapsed_seconds=(
            (now - enclosure.last_synced_at).total_seconds() if enclosure.last_synced_at else float("inf")
        ),
    )

    enclosure.temperature = payload.temperature
    enclosure.humidity = payload.humidity
    enclosure.air_quality = payload.air_quality
    enclosure.light = payload.light
    enclosure.sound = payload.sound
    enclosure.last_synced_at = now

    new_insight = compute_insight(temperature=payload.temperature, air_quality=payload.air_quality, elapsed_seconds=0)

    if new_insight.status != "healthy" and new_insight.status != previous_insight.status:
        db.add(
            models.Alert(
                enclosure_id=enclosure_id,
                kind=new_insight.status,
                message=new_insight.reason,
                created_at=now,
            )
        )
    elif new_insight.status == "healthy" and previous_insight.status != "healthy":
        db.query(models.Alert).filter_by(enclosure_id=enclosure_id, resolved=False).update({"resolved": True})

    db.commit()
    db.refresh(enclosure)
    return _with_live_insight(enclosure)


@router.get("/{enclosure_id}/alerts", response_model=list[schemas.AlertOut])
def list_alerts(enclosure_id: str, db: Session = Depends(get_db)):
    if not db.get(models.Enclosure, enclosure_id):
        raise HTTPException(status_code=404, detail="Enclosure not found")
    return (
        db.query(models.Alert)
        .filter_by(enclosure_id=enclosure_id)
        .order_by(models.Alert.created_at.desc())
        .all()
    )
