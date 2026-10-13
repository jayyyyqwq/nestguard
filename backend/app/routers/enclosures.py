from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import require_api_key
from app.database import get_db
from app.devices import DEVICES
from app.services import record_reading, with_live_insight

router = APIRouter(prefix="/enclosures", tags=["enclosures"])


def _get_or_404(db: Session, enclosure_id: str) -> models.Enclosure:
    enclosure = db.get(models.Enclosure, enclosure_id)
    if not enclosure:
        raise HTTPException(status_code=404, detail="Enclosure not found")
    return enclosure


@router.get("", response_model=list[schemas.EnclosureOut])
def list_enclosures(db: Session = Depends(get_db)):
    enclosures = db.query(models.Enclosure).all()
    order = list(DEVICES)
    return [with_live_insight(e) for e in sorted(enclosures, key=lambda e: order.index(e.id))]


@router.post("", response_model=schemas.EnclosureOut, status_code=201, dependencies=[Depends(require_api_key)])
def create_enclosure(payload: schemas.EnclosureCreate, db: Session = Depends(get_db)):
    device = DEVICES.get(payload.id)
    if not device:
        raise HTTPException(status_code=422, detail=f"Unknown box ID. Use one of: {', '.join(DEVICES)}")
    if db.get(models.Enclosure, payload.id):
        raise HTTPException(status_code=409, detail="Enclosure with this ID already exists")
    enclosure = models.Enclosure(id=device.id, name=payload.name or device.label)
    db.add(enclosure)
    db.commit()
    db.refresh(enclosure)
    return with_live_insight(enclosure)


@router.get("/{enclosure_id}", response_model=schemas.EnclosureOut)
def get_enclosure(enclosure_id: str, db: Session = Depends(get_db)):
    return with_live_insight(_get_or_404(db, enclosure_id))


@router.post(
    "/{enclosure_id}/readings",
    response_model=schemas.EnclosureOut,
    dependencies=[Depends(require_api_key)],
)
def ingest_reading(enclosure_id: str, payload: schemas.ReadingIn, db: Session = Depends(get_db)):
    enclosure = _get_or_404(db, enclosure_id)
    record_reading(db, enclosure, payload)
    db.refresh(enclosure)
    return with_live_insight(enclosure)


@router.get("/{enclosure_id}/alerts", response_model=list[schemas.AlertOut])
def list_enclosure_alerts(enclosure_id: str, db: Session = Depends(get_db)):
    _get_or_404(db, enclosure_id)
    return (
        db.query(models.Alert)
        .filter_by(enclosure_id=enclosure_id)
        .order_by(models.Alert.created_at.desc(), models.Alert.id.desc())
        .all()
    )
