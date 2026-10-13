"""
Virtual ESP32: a 2-minute scripted scenario for demoing NestGuard without hardware.

Every TICK_S seconds it posts one reading per registered enclosure through the
same record_reading() path a real box uses, so alerts open and resolve exactly
as they would in the field. Story: the coop overheats on a hot afternoon and
recovers, then the hive's air turns bad and recovers; the shelter stays calm.

Simulated data only exists while a run is on: starting, finishing or stopping
a run puts every box back to "waiting for first reading" (no readings, no
alerts), so a finished demo never lingers as stale or "offline" boxes.
"""

import asyncio
import math
import threading
import time

from app import models, schemas
from app.database import SessionLocal
from app.devices import DEVICES
from app.services import record_reading

DURATION_S = 120
TICK_S = 3
END_HOLD_S = 6  # keep the final "all clear" on screen briefly before resetting

PHASES = [  # (ends at progress, description)
    (0.10, "Baseline: every box reporting normally"),
    (0.35, "Afternoon heat building inside the coop"),
    (0.55, "Coop past its danger limit"),
    (0.75, "Coop cooling down, hive air getting stale"),
    (0.90, "Hive vent cleared, air recovering"),
    (1.01, "All clear: everything back to normal"),
]

_task: asyncio.Task | None = None
_started_at = 0.0
# A cancelled task can't stop a tick already running in its worker thread, so
# ticks and resets take turns: a reset never lands in the middle of a tick.
_db_lock = threading.Lock()


def _bump(t: float, rise: float, top: float, fall: float, end: float) -> float:
    """0 before `rise`, ramps to 1 by `top`, holds until `fall`, back to 0 by `end`."""
    if t <= rise or t >= end:
        return 0.0
    if t < top:
        return (t - rise) / (top - rise)
    if t <= fall:
        return 1.0
    return (end - t) / (end - fall)


def scripted_reading(kind: str, t: float) -> schemas.ReadingIn:
    """The reading a box of this kind reports at scenario progress t (0-1)."""
    wobble = math.sin(t * 47)  # small sensor jitter, deterministic for tests
    if kind == "coop":
        heat = _bump(t, 0.10, 0.38, 0.52, 0.80)
        return schemas.ReadingIn(
            temperature=round(26 + 11.5 * heat + 0.3 * wobble, 1),
            humidity=round(62 - 14 * heat + wobble, 1),
            air_quality=round(950 + 300 * heat + 20 * wobble),
            light=640,
            sound=round(1300 + 1500 * heat + 40 * wobble),  # panting, distress calls
        )
    if kind == "beehive":
        stale = _bump(t, 0.50, 0.62, 0.74, 0.88)
        return schemas.ReadingIn(
            temperature=round(34.9 + 0.3 * wobble, 1),  # normal brood temperature for bees
            humidity=round(58 + 6 * stale + wobble, 1),
            air_quality=round(1100 + 1350 * stale + 25 * wobble),
            light=40,
            sound=round(1700 + 900 * stale + 50 * wobble),  # fanning bees
        )
    return schemas.ReadingIn(  # shelter: steady and healthy
        temperature=round(22.5 + 0.4 * wobble, 1),
        humidity=round(55 + wobble, 1),
        air_quality=round(760 + 15 * wobble),
        light=420,
        sound=round(600 + 30 * wobble),
    )


def phase(t: float) -> str:
    return next(text for end, text in PHASES if t < end)


def reset_to_waiting() -> None:
    """Wipes all readings and alerts and zeroes every box's live values, so each
    registered box shows "waiting for first reading" again."""
    with _db_lock:
        db = SessionLocal()
        try:
            db.query(models.SensorReading).delete()
            db.query(models.Alert).delete()
            db.query(models.Enclosure).update(
                {"temperature": 0, "humidity": 0, "air_quality": 0, "light": 0, "sound": 0, "last_synced_at": None}
            )
            db.commit()
        finally:
            db.close()


def tick(t: float) -> None:
    with _db_lock:
        db = SessionLocal()
        try:
            for enclosure in db.query(models.Enclosure).all():
                record_reading(db, enclosure, scripted_reading(DEVICES[enclosure.id].kind, t))
        finally:
            db.close()


def is_running() -> bool:
    return _task is not None and not _task.done()


async def _run() -> None:
    steps = DURATION_S // TICK_S
    await asyncio.to_thread(reset_to_waiting)
    for step in range(steps + 1):
        await asyncio.to_thread(tick, step / steps)
        if step < steps:
            await asyncio.sleep(TICK_S)
    await asyncio.sleep(END_HOLD_S)
    await asyncio.to_thread(reset_to_waiting)


def start() -> None:
    global _task, _started_at
    if is_running():
        return
    _started_at = time.monotonic()
    _task = asyncio.create_task(_run())


def stop() -> None:
    global _task
    if is_running():
        _task.cancel()
        reset_to_waiting()
    _task = None


def status() -> schemas.SimulationStatus:
    running = is_running()
    elapsed = min(time.monotonic() - _started_at, DURATION_S) if running else 0
    progress = elapsed / DURATION_S
    return schemas.SimulationStatus(
        running=running,
        progress=round(progress, 3),
        elapsed_seconds=int(elapsed),
        duration_seconds=DURATION_S,
        phase=phase(progress) if running else "",
    )
