"""
Shared-secret gate for write endpoints.

Not real user auth: there's no login, no per-user identity, just one API key
that the ESP32 firmware and the frontend's server-side code attach. Guards every
write: registering a box, ingesting readings, starting/stopping the simulation.
"""

import os

from fastapi import Header, HTTPException

API_KEY = os.getenv("API_KEY", "dev-local-key")


def require_api_key(x_api_key: str | None = Header(default=None)) -> None:
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Missing or invalid API key")
