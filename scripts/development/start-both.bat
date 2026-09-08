@echo off
title Saravana Bhavan SaaS Launcher
echo ============================================================
echo Starting Saravana Bhavan Feedback System...
echo - Backend:  http://localhost:5000
echo - Frontend: http://localhost:3000
echo ============================================================

start "Saravana Bhavan - Backend (Port 5000)" cmd /k "cd /d %~dp0backend && node server.js"
start "Saravana Bhavan - Frontend (Port 3000)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Both servers launched in separate windows!
echo Customer Website:  http://localhost:3000
echo Manager Dashboard: http://localhost:3000/manager/login
echo Backend API:       http://localhost:5000/api
echo ============================================================
