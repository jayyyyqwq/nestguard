import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import discovery
from app.database import Base, engine
from app.routers import enclosures, overview, simulation

load_dotenv()

Base.metadata.create_all(bind=engine)

logging.basicConfig(level=logging.INFO, format="%(levelname)s:  %(message)s")


@asynccontextmanager
async def lifespan(_: FastAPI):
    transport = await discovery.start()
    yield
    if transport:
        transport.close()


app = FastAPI(title="NestGuard API", version="0.1.0", lifespan=lifespan)

frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_origin],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(enclosures.router)
app.include_router(overview.router)
app.include_router(simulation.router)


@app.get("/health")
def health():
    return {"status": "ok"}
