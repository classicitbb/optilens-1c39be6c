@echo off
REM ============================================================
REM  OptiLens / Classic Visions - local dev launcher
REM  Double-click this file to start the site on your machine.
REM ============================================================
setlocal enableextensions
cd /d "%~dp0"
set "SITE_PORT=%PORT%"
if not defined SITE_PORT set "SITE_PORT=8080"
set "SITE_URL=http://127.0.0.1:%SITE_PORT%"

REM --- Prefer the project's default supported runtime when nvm is installed ---
where nvm >nul 2>nul
if not errorlevel 1 (
  call nvm use 22 >nul 2>nul
)

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

for /f "tokens=1 delims=." %%N in ('node -p "process.versions.node"') do set "NODE_MAJOR=%%N"
if not "%NODE_MAJOR%"=="20" if not "%NODE_MAJOR%"=="22" (
  if exist "node_modules\vite" (
    echo [WARNING] Node.js %NODE_MAJOR%.x is outside the supported 20.x/22.x range.
    echo           Starting the existing dependency install. Use Node 22 for clean installs.
  ) else (
    echo.
    echo [ERROR] OptiLens requires Node.js 20.x or 22.x for a clean install. Detected Node.js %NODE_MAJOR%.x.
    echo         Install Node 22 with nvm, then run this launcher again.
    echo.
    pause
    exit /b 1
  )
)

REM --- Use the repository's required npm 10.x ---
where corepack >nul 2>nul
if not errorlevel 1 (
  call corepack npm@10 --version >nul 2>nul
  if not errorlevel 1 set "NPM_CMD=corepack npm@10"
)

if not defined NPM_CMD (
  for /f "tokens=1 delims=." %%N in ('npm --version') do set "NPM_MAJOR=%%N"
  if not "%NPM_MAJOR%"=="10" (
    echo.
    echo [ERROR] OptiLens requires npm 10.x. Install Corepack or npm 10, then try again.
    echo.
    pause
    exit /b 1
  )
  set "NPM_CMD=npm"
)

REM --- Install dependencies if they are missing ---
if not exist "node_modules\vite" (
  echo Installing dependencies ^(first run^)...
  call %NPM_CMD% ci
  if errorlevel 1 (
    echo.
    echo [ERROR] Dependency installation failed. See the messages above.
    echo.
    pause
    exit /b 1
  )
)

echo.
echo Starting the dev server...
echo The site will open at %SITE_URL%
echo Press Ctrl+C in this window to stop it.
echo.

REM --- Vite opens the default browser after its server is listening. ---
call %NPM_CMD% run dev -- --host 127.0.0.1 --port %SITE_PORT% --strictPort --open
set "EXIT_CODE=%ERRORLEVEL%"

REM Keep the window open if the server exits unexpectedly
if not "%EXIT_CODE%"=="0" (
  echo.
  echo [ERROR] The dev server stopped with exit code %EXIT_CODE%.
  pause
)

endlocal & exit /b %EXIT_CODE%
