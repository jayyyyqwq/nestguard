#!/usr/bin/env bash
# Starts the NestGuard backend and dashboard on macOS. Run setup.sh once first.
# Both run in this Terminal window. Press Ctrl+C or close the window to stop them.

set -eu
cd "$(dirname "$0")"

VPY="$PWD/backend/venv/bin/python"
if [ ! -x "$VPY" ] || [ ! -d node_modules ]; then
  echo "NestGuard isn't set up yet. Run: bash setup.sh"
  exit 1
fi

# Stop both servers when this script stops.
trap 'trap - INT TERM EXIT; kill 0 2>/dev/null' INT TERM EXIT

echo "Starting backend  on http://localhost:8000  (API docs: /docs)"
(cd backend && exec "$VPY" -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000) &

echo "Starting dashboard on http://localhost:3000"
npm run dev &

# Keep the Mac from sleeping while NestGuard runs, so the boxes can always reach it.
if command -v caffeinate >/dev/null 2>&1; then
  caffeinate -i -w $$ &
fi

echo "Opening browser in a few seconds..."
sleep 10
open http://localhost:3000 2>/dev/null || true

echo
echo "NestGuard is running. Keep this window open. Press Ctrl+C to stop."
wait
