@echo off
echo Running Backend Automated Tests...
cd backend
.venv\Scripts\pytest -v
cd ..
pause
