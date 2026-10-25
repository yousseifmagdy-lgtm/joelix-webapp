@echo off
title Joelix Video Game
cd /d "%~dp0"
set "CODEX_SANDBOX_NETWORK_DISABLED="
set "CODEX_PERMISSION_PROFILE="

curl.exe --silent --fail --max-time 2 http://localhost:3000/health >nul 2>nul
if not errorlevel 1 goto already_running

set "JOELIX_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if exist "%JOELIX_NODE%" goto start

where node.exe >nul 2>nul
if errorlevel 1 goto missing
set "JOELIX_NODE=node.exe"

:start
echo Starting Joelix Video Game...
echo Joelix will stay running in the background after this window closes.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\launch-joelix.ps1" -NodePath "%JOELIX_NODE%" -ProjectRoot "%~dp0"
if errorlevel 1 goto launch_failed
exit /b

:already_running
echo Joelix is already running. Opening the website...
start "" "http://localhost:3000"
exit /b

:launch_failed
echo.
echo Joelix could not start. Press any key to close.
pause >nul
exit /b

:missing
echo Joelix needs Node.js 22 or newer.
echo Install Node.js, then double-click this file again.
pause
exit /b
