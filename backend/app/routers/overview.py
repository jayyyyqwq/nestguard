from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.devices import DEVICES

router = APIRouter(tags=["overview"])


@router.get("/devices", response_model=list[schemas.DeviceOut])
def list_devices(db: Session = Depends(get_db)):
    """The three NestGuard boxes and whether each is registered yet."""
    registered = {row.id for row in db.query(models.Enclosure.id)}
    return [
        schemas.DeviceOut(id=d.id, kind=d.kind, label=d.label, registered=d.id in registered)
        for d in DEVICES.values()
    ]


@router.get("/alerts", response_model=list[schemas.AlertOut])
def list_recent_alerts(limit: int = Query(default=20, ge=1, le=100), db: Session = Depends(get_db)):
    """Latest alerts across all enclosures, newest first."""
    return (
        db.query(models.Alert)
        .order_by(models.Alert.created_at.desc(), models.Alert.id.desc())
        .limit(limit)
        .all()
    )
