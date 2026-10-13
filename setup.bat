@echo off
rem NestGuard one-step setup for Windows.
rem Installs everything needed, then starts the backend and dashboard.
rem Safe to re-run: existing venv, node_modules, .env files and database are reused.
rem
rem   setup.bat                 install + run
rem   setup.bat --install-only  install, don't start servers

setlocal
title NestGuard setup
cd /d "%~dp0"

echo.
echo === NestGuard setup ===
echo.

rem ---------- 1. Python 3.11+ ----------
call :find_python
if not defined PY (
    echo [!] Python 3.11+ not found.
    call :winget_install Python.Python.3.12 "Python 3.12" "https://www.python.org/downloads/"
    exit /b 1
)
echo [ok] Python: %PY%

rem ---------- 2. Node.js 18+ ----------
node -e "process.exit(+process.versions.node.split('.')[0] >= 18 ? 0 : 1)" >nul 2>&1
if errorlevel 1 (
    echo [!] Node.js 18+ not found.
    call :winget_install OpenJS.NodeJS.LTS "Node.js LTS" "https://nodejs.org/"
    exit /b 1
)
for /f %%v in ('node --version') do echo [ok] Node.js %%v

rem ---------- 3. Backend ----------
echo.
echo --- Backend ---
set "VPY=%CD%\backend\venv\Scripts\python.exe"

rem A venv copied from another computer points at a Python that isn't here; rebuild it.
if exist "%VPY%" (
    "%VPY%" -c "import sys" >nul 2>&1 || (
        echo Existing venv is broken, recreating...
        rmdir /s /q backend\venv
    )
)
if not exist "%VPY%" (
    echo Creating virtual environment...
    %PY% -m venv backend\venv || goto :fail
)

echo Installing Python packages...
"%VPY%" -m pip install --upgrade pip --quiet --disable-pip-version-check || goto :fail
"%VPY%" -m pip install -r backend\requirements.txt --quiet --disable-pip-version-check || goto :fail

if not exist backend\.env (
    copy backend\.env.example backend\.env >nul
    echo Created backend\.env from .env.example
)

echo Seeding database...
pushd backend
"%VPY%" -m app.seed
if errorlevel 1 (popd & goto :fail)
popd

rem ---------- 4. Frontend ----------
echo.
echo --- Frontend ---
if not exist .env.local (
    copy .env.local.example .env.local >nul
    echo Created .env.local from .env.local.example
)

echo Installing npm packages...
call npm install --no-audit --no-fund || goto :fail

rem ---------- 5. Firewall ----------
echo.
echo --- Network ---
netsh advfirewall firewall show rule name="NestGuard" >nul 2>&1
if errorlevel 1 (
    echo Allowing NestGuard boxes on your Wi-Fi to reach this laptop.
    echo Click YES on the Windows admin prompt.
    powershell -NoProfile -Command "Start-Process -FilePath '%CD%\scripts\allow-firewall.bat' -Verb RunAs -Wait" >nul 2>&1
)
netsh advfirewall firewall show rule name="NestGuard" >nul 2>&1
if errorlevel 1 (
    echo [!] Firewall not updated. The dashboard works, but sensor boxes can't reach
    echo     this laptop until you right-click scripts\allow-firewall.bat and choose
    echo     "Run as administrator".
) else (
    echo [ok] Firewall allows NestGuard boxes on the local network
)

echo.
echo === Setup complete ===

if /i "%~1"=="--install-only" (
    echo Skipping launch. Start the app with run.bat.
    exit /b 0
)

rem ---------- 6. Launch ----------
echo From now on, start the app with run.bat.
echo.
call run.bat
exit /b %errorlevel%


rem ================= helpers =================

:find_python
rem Prefer 3.12/3.13 (pinned deps are known-good there), fall back to any 3.11+.
set "PY="
for %%C in ("py -3.12" "py -3.13" "py -3.11" "py -3" "python") do (
    if not defined PY (
        %%~C -c "import sys; sys.exit(0 if sys.version_info >= (3, 11) else 1)" >nul 2>&1 && set "PY=%%~C"
    )
)
exit /b 0

:winget_install
rem %1 = winget id, %2 = display name, %3 = manual download URL
where winget >nul 2>&1
if errorlevel 1 (
    echo     winget is not available. Install %~2 manually from %~3
    echo     then run setup.bat again.
    pause
    exit /b 1
)
echo     Installing %~2 with winget...
winget install -e --id %~1 --accept-source-agreements --accept-package-agreements
echo.
echo     %~2 installed. Close this window and run setup.bat again
echo     so the new PATH is picked up.
pause
exit /b 1

:fail
echo.
echo [x] Setup failed. See the error above.
pause
exit /b 1
