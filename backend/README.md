# NestGuard — backend

FastAPI + SQLite backend serving live sensor data for enclosures (beehive, chicken coop, or any
small livestock enclosure).

## Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

pip install -r requirements.txt
copy .env.example .env       # Windows; `cp` on macOS/Linux — defaults work as-is

python -m app.seed           # creates honeychain.db and loads sample data
uvicorn app.main:app --reload --port 8000
```

API docs (auto-generated): http://localhost:8000/docs

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/enclosures` | — | All enclosures (for the dashboard list) |
| GET | `/enclosures/{id}` | — | One enclosure incl. sensor trend (for the detail page) |
| GET | `/health` | — | Liveness check |

`X-API-Key` gating (`app/auth.py`, `require_api_key`) is kept as infra for future write endpoints
(e.g. real ESP32 sensor ingestion) even though nothing currently requires it.

Run the test suite with `python -m pytest` (see `tests/`).
