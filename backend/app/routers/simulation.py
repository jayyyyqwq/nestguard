from fastapi import APIRouter, Depends

from app import schemas, simulation
from app.auth import require_api_key

router = APIRouter(prefix="/simulation", tags=["simulation"])


@router.get("", response_model=schemas.SimulationStatus)
def get_status():
    return simulation.status()


@router.post("/start", response_model=schemas.SimulationStatus, dependencies=[Depends(require_api_key)])
async def start():
    simulation.start()
    return simulation.status()


@router.post("/stop", response_model=schemas.SimulationStatus, dependencies=[Depends(require_api_key)])
async def stop():
    simulation.stop()
    return simulation.status()
