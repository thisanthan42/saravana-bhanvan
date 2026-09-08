@echo off
title Saravana Bhavan Test Suite Runner
echo ============================================================
echo Running Saravana Bhavan Automated Test Suites...
echo ============================================================

cd /d %~dp0..\..\backend
node tests\test-live-integration.js

echo.
echo Test Execution Finished.
pause
