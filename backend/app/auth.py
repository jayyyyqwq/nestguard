"""
Shared-secret gate for write endpoints.

Not real user auth — there's no login, no per-user identity, just one API key
that the frontend's server-side code attaches automatically. Currently unused
(no write endpoints exist yet), kept as the pattern a future device-ingestion
endpoint (e.g. an ESP32 posting sensor readings) will reuse.
"""

import os

from fastapi import Header, HTTPException

API_KEY = os.getenv("API_KEY", "dev-local-key")


def require_api_key(x_api_key: str | None = Header(default=None)) -> None:
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Missing or invalid API key")
