@echo off
REM ============================================================
REM  OptiLens / Classic Visions - local dev launcher
REM  Double-click this file to start the site on your machine.
REM ============================================================
setlocal enableextensions
cd /d "%~dp0"

REM --- Check Node.js is available ---
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo [ERROR] Node.js was not found on your PATH.
  echo         Install the LTS version from https://nodejs.org/ and run this again.
  echo.
  pause
  exit /b 1
)

REM --- Install dependencies if they are missing ---
if not exist "node_modules\vite" (
  echo Installing dependencies ^(first run^)...
  call npm install
  if errorlevel 1 (
    echo.
    echo [ERROR] npm install failed. See the messages above.
    echo.
    pause
    exit /b 1
  )
)

echo.
echo Starting the dev server...
echo The site will open at http://localhost:8080
echo Press Ctrl+C in this window to stop it.
echo.

REM --- Start Vite and open the browser automatically ---
call npm run dev -- --open

REM Keep the window open if the server exits unexpectedly
pause
