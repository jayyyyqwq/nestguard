@echo off
rem Starts the NestGuard backend and dashboard. Run setup.bat once first.

setlocal
cd /d "%~dp0"

set "VPY=%CD%\backend\venv\Scripts\python.exe"
if not exist "%VPY%" goto :not_setup
if not exist node_modules goto :not_setup

netsh advfirewall firewall show rule name="NestGuard" >nul 2>&1
if errorlevel 1 (
    echo [!] Sensor boxes can't reach this laptop yet: run setup.bat once more and
    echo     click YES on the admin prompt. The dashboard and simulation still work.
    echo.
)

echo Starting backend  on http://localhost:8000  (API docs: /docs)
start "NestGuard backend" /d "%CD%\backend" cmd /k ""%VPY%" -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

echo Starting dashboard on http://localhost:3000
start "NestGuard frontend" /d "%CD%" cmd /k "npm run dev"

echo Opening browser in a few seconds...
timeout /t 10 /nobreak >nul
start "" http://localhost:3000

echo.
echo Both servers run in their own windows. Close those windows to stop them.
exit /b 0

:not_setup
echo NestGuard isn't set up yet. Run setup.bat first.
pause
exit /b 1
