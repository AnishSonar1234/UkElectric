@echo off
echo ========================================================
echo   WindSight Analytics - Starting Backend & Frontend
echo ========================================================

echo Starting FastAPI Backend on http://localhost:8000 ...
start "WindSight Backend" cmd /k "cd backend && .venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

echo Starting Vite React Frontend on http://localhost:5173 ...
start "WindSight Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Application is starting!
echo Frontend Dashboard: http://localhost:5173
echo Backend API Docs:   http://localhost:8000/docs
echo ========================================================
pause
