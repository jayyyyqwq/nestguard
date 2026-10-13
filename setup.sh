#!/usr/bin/env bash
# NestGuard one-step setup for macOS.
# Installs everything needed, then starts the backend and dashboard.
# Safe to re-run: existing venv, node_modules, .env files and database are reused.
#
#   bash setup.sh                 install + run
#   bash setup.sh --install-only  install, don't start servers

set -eu
cd "$(dirname "$0")"

fail() {
  echo
  echo "[x] Setup failed. See the error above."
  exit 1
}
trap fail ERR

# $1 = Homebrew formula, $2 = display name, $3 = manual download URL
brew_install() {
  if ! command -v brew >/dev/null 2>&1; then
    echo "    Install $2 from $3"
    echo "    then run setup.sh again."
    exit 1
  fi
  echo "    Installing $2 with Homebrew..."
  brew install "$1"
  echo
  echo "    $2 installed. Run setup.sh again."
  exit 1
}

echo
echo "=== NestGuard setup ==="
echo

# ---------- 1. Python 3.11+ ----------
# The python3 that comes with macOS is 3.9, too old.
PY=""
for candidate in python3.12 python3.13 python3.11 python3; do
  if command -v "$candidate" >/dev/null 2>&1 &&
    "$candidate" -c "import sys; sys.exit(0 if sys.version_info >= (3, 11) else 1)" >/dev/null 2>&1; then
    PY="$candidate"
    break
  fi
done
if [ -z "$PY" ]; then
  echo "[!] Python 3.11+ not found."
  brew_install python@3.12 "Python 3.12" "https://www.python.org/downloads/macos/"
fi
echo "[ok] Python: $PY"

# ---------- 2. Node.js 18+ ----------
if ! node -e "process.exit(+process.versions.node.split('.')[0] >= 18 ? 0 : 1)" >/dev/null 2>&1; then
  echo "[!] Node.js 18+ not found."
  brew_install node "Node.js" "https://nodejs.org/"
fi
echo "[ok] Node.js $(node --version)"

# ---------- 3. Backend ----------
echo
echo "--- Backend ---"
VPY="$PWD/backend/venv/bin/python"

# A venv copied from another computer (or from Windows) doesn't run here; rebuild it.
if [ -d backend/venv ] && ! "$VPY" -c "import sys" >/dev/null 2>&1; then
  echo "Existing venv is from another computer, recreating..."
  rm -rf backend/venv
fi
if [ ! -x "$VPY" ]; then
  echo "Creating virtual environment..."
  "$PY" -m venv backend/venv
fi

echo "Installing Python packages..."
"$VPY" -m pip install --upgrade pip --quiet --disable-pip-version-check
"$VPY" -m pip install -r backend/requirements.txt --quiet --disable-pip-version-check

if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
  echo "Created backend/.env from .env.example"
fi

echo "Seeding database..."
(cd backend && "$VPY" -m app.seed)

# ---------- 4. Frontend ----------
echo
echo "--- Frontend ---"
if [ ! -f .env.local ]; then
  cp .env.local.example .env.local
  echo "Created .env.local from .env.local.example"
fi

# node_modules copied from Windows has the wrong Next.js compiler; reinstall it.
if [ -d node_modules ] && ! ls node_modules/@next 2>/dev/null | grep -q "swc-$(node -p process.platform)"; then
  echo "Existing node_modules is from another computer, reinstalling..."
  rm -rf node_modules .next
fi

echo "Installing npm packages..."
npm install --no-audit --no-fund

# ---------- 5. Network ----------
echo
echo "--- Network ---"
echo "When macOS asks whether Python may accept incoming network connections,"
echo "or whether Terminal may find devices on your local network, click Allow."
echo "That is what lets the sensor boxes reach this Mac."

echo
echo "=== Setup complete ==="

if [ "${1:-}" = "--install-only" ]; then
  echo "Skipping launch. Start the app with: bash run.sh"
  exit 0
fi

# ---------- 6. Launch ----------
echo "From now on, start the app with: bash run.sh"
echo
trap - ERR
exec bash run.sh
