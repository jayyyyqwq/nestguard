# NestGuard backend

FastAPI + SQLite backend for the three NestGuard sensor boxes (beehive `HIVE1`, chicken coop
`COOP1`, livestock shelter `SHED1`). Stores readings, computes a per-animal status, opens and
closes alerts, runs the demo simulation, and answers box discovery on the local network.

## Setup

`setup.bat` (Windows) or `setup.sh` (macOS) in the project root does all of this. By hand:

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows; on macOS/Linux: source venv/bin/activate

pip install -r requirements.txt
copy .env.example .env       # Windows; `cp` on macOS/Linux. Defaults work as-is

python -m app.seed           # creates honeychain.db, registers HIVE1 + COOP1 (--reset to start over)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API docs (auto-generated): http://localhost:8000/docs

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/enclosures` | | All registered enclosures with live status |
| POST | `/enclosures` | key | Register one of the three boxes |
| GET | `/enclosures/{id}` | | One enclosure incl. trend and limits |
| POST | `/enclosures/{id}/readings` | key | Ingest a reading (what the ESP32 posts) |
| GET | `/enclosures/{id}/alerts` | | Alert history for one enclosure |
| GET | `/devices` | | The three boxes and whether each is registered |
| GET | `/alerts` | | Latest alerts across all enclosures |
| GET | `/simulation` | | Simulation status |
| POST | `/simulation/start` | key | Start the 2-minute demo scenario |
| POST | `/simulation/stop` | key | Stop it and reset boxes to "waiting" |
| GET | `/health` | | Liveness check |

"key" = `X-API-Key` header matching `API_KEY` in `.env`. The ESP32 firmware and the Next.js proxy
routes (`app/api/`) attach it; the browser never sees it.

Box discovery runs alongside the API on UDP port 47800 (`app/discovery.py`).

## Layout

| File | What it does |
|---|---|
| `app/devices.py` | The three boxes and their per-animal temperature limits |
| `app/insight.py` | Rule-based status and plain-language verdict |
| `app/services.py` | Reading ingestion, alert open/close |
| `app/simulation.py` | Virtual ESP32 demo scenario |
| `app/discovery.py` | Answers "where is NestGuard?" broadcasts from boxes |
| `app/seed.py` | Registers HIVE1 + COOP1 with no readings |

Run the test suite with `python -m pytest`.
