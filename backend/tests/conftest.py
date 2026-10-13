import os
from datetime import datetime, timedelta

# Must be set before app.database is imported anywhere.
# DATABASE_URL keeps the suite off the real honeychain.db.
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_honeychain.db")
os.environ.setdefault("API_KEY", "test-api-key")
os.environ.setdefault("FRONTEND_ORIGIN", "http://localhost:3000")

import pytest
from fastapi.testclient import TestClient

from app.database import Base, SessionLocal, engine
from app.main import app
from app.models import Enclosure


@pytest.fixture(autouse=True)
def _fresh_db():
    """Creates a clean schema with a recently-synced, healthy coop (COOP1) before each test."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        db.add(
            Enclosure(
                id="COOP1",
                name="Chicken coop",
                temperature=24.0,
                humidity=55.0,
                air_quality=700.0,
                light=300.0,
                sound=500.0,
                last_synced_at=datetime.now() - timedelta(minutes=1),
            )
        )
        db.commit()
    finally:
        db.close()

    yield

    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    return TestClient(app)
