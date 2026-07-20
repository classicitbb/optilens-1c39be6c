@echo off
REM ============================================================
REM  OptiLens / Classic Visions - local preview launcher
REM  Double-click this file to install missing local tooling,
REM  build the site, and open it on this machine.
REM ============================================================
setlocal EnableExtensions
cd /d "%~dp0"

set "SITE_PORT=%PORT%"
if not defined SITE_PORT set "SITE_PORT=8080"
set "SITE_URL=http://127.0.0.1:%SITE_PORT%"
set "NODE_VERSION=22"
set "EXIT_CODE=0"

call :EnsureNode || goto fail
call :EnsureNpm || goto fail
call :InstallDependencies || goto fail
call :BuildSite || goto fail

echo.
echo Starting the local preview server...
echo The site will open at %SITE_URL% unless Vite chooses another free port.
echo Press Ctrl+C in this window to stop it.
echo.

call %NPM_CMD% run preview -- --host 127.0.0.1 --port %SITE_PORT% --open
set "EXIT_CODE=%ERRORLEVEL%"
goto done

:fail
set "EXIT_CODE=1"

:done
if not "%EXIT_CODE%"=="0" (
  echo.
  echo [ERROR] The launcher stopped with exit code %EXIT_CODE%.
  pause
)

endlocal & exit /b %EXIT_CODE%

:EnsureNode
where nvm >nul 2>nul
if not errorlevel 1 (
  call nvm use %NODE_VERSION% >nul 2>nul
)

call :UseInstalledNode22 >nul 2>nul
call :RefreshPath
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Trying to install Node %NODE_VERSION% with nvm for Windows...
  call :InstallNodeToolchain || exit /b 1
)

call :RefreshPath
for /f "tokens=1 delims=." %%N in ('node -p "process.versions.node" 2^>nul') do set "NODE_MAJOR=%%N"
if "%NODE_MAJOR%"=="20" exit /b 0
if "%NODE_MAJOR%"=="22" exit /b 0

echo Detected Node.js %NODE_MAJOR%.x. OptiLens supports Node.js 20.x or 22.x.
call :UseInstalledNode22
if not errorlevel 1 (
  for /f "tokens=1 delims=." %%N in ('node -p "process.versions.node" 2^>nul') do set "NODE_MAJOR=%%N"
  if "%NODE_MAJOR%"=="22" exit /b 0
)

where nvm >nul 2>nul
if not errorlevel 1 (
  echo Installing and switching to Node %NODE_VERSION% with nvm...
  call nvm install %NODE_VERSION%
  if errorlevel 1 exit /b 1
  call nvm use %NODE_VERSION%
  if errorlevel 1 exit /b 1
  call :RefreshPath
  for /f "tokens=1 delims=." %%N in ('node -p "process.versions.node" 2^>nul') do set "NODE_MAJOR=%%N"
  if "%NODE_MAJOR%"=="22" exit /b 0
)

echo.
echo [ERROR] A supported Node.js runtime could not be selected.
echo         Install Node.js 22 or nvm for Windows, then run this launcher again.
echo.
exit /b 1

:InstallNodeToolchain
where nvm >nul 2>nul
if not errorlevel 1 (
  call nvm install %NODE_VERSION%
  if errorlevel 1 exit /b 1
  call nvm use %NODE_VERSION%
  exit /b %ERRORLEVEL%
)

where winget >nul 2>nul
if errorlevel 1 (
  echo.
  echo [ERROR] Neither Node.js nor winget was found.
  echo         Install Node.js 22 from https://nodejs.org/ or install winget, then run this again.
  echo.
  exit /b 1
)

echo Installing Node.js %NODE_VERSION% through winget. Approve the installer if Windows asks.
winget install --id OpenJS.NodeJS.22 -e --accept-source-agreements --accept-package-agreements
if errorlevel 1 (
  echo.
  echo [ERROR] winget could not install Node.js %NODE_VERSION%.
  echo         Install Node.js 22 manually, then run this launcher again.
  echo.
  exit /b 1
)

call :UseInstalledNode22
if not errorlevel 1 exit /b 0

echo Installing nvm for Windows through winget as a fallback.
winget install --id CoreyButler.NVMforWindows -e --accept-source-agreements --accept-package-agreements
if errorlevel 1 (
  echo.
  echo [ERROR] winget could not install nvm for Windows.
  echo         Install Node.js 22 manually, then run this launcher again.
  echo.
  exit /b 1
)

set "PATH=%ProgramFiles%\nvm;%APPDATA%\nvm;%LOCALAPPDATA%\Programs\nvm;%PATH%"
where nvm >nul 2>nul
if errorlevel 1 (
  echo.
  echo [ERROR] nvm installed, but it is not available in this window yet.
  echo         Close this window and double-click the launcher again.
  echo.
  exit /b 1
)

call nvm install %NODE_VERSION%
if errorlevel 1 exit /b 1
call nvm use %NODE_VERSION%
exit /b %ERRORLEVEL%

:EnsureNpm
call :RefreshPath
where npm >nul 2>nul
if errorlevel 1 (
  echo.
  echo [ERROR] npm was not found after Node.js setup.
  echo.
  exit /b 1
)

for /f "tokens=1 delims=." %%N in ('npm --version 2^>nul') do set "NPM_MAJOR=%%N"
if "%NPM_MAJOR%"=="10" (
  set "NPM_CMD=npm"
  exit /b 0
)

echo Installing npm 10.x for this project...
call npm install -g npm@10 --no-audit --no-fund
if errorlevel 1 (
  echo.
  echo [ERROR] npm 10.x installation failed.
  echo.
  exit /b 1
)

call :RefreshPath
for /f "tokens=1 delims=." %%N in ('npm --version 2^>nul') do set "NPM_MAJOR=%%N"
if not "%NPM_MAJOR%"=="10" (
  echo.
  echo [ERROR] npm %NPM_MAJOR%.x is active, but this repo requires npm 10.x.
  echo.
  exit /b 1
)

set "NPM_CMD=npm"
exit /b 0

:InstallDependencies
if not exist "package-lock.json" (
  echo.
  echo [ERROR] package-lock.json is missing. This launcher expects an npm lockfile.
  echo.
  exit /b 1
)

set "NEEDS_INSTALL=0"
if not exist "node_modules\vite" set "NEEDS_INSTALL=1"
if not exist "node_modules\.bin\vite.cmd" set "NEEDS_INSTALL=1"
if not exist "node_modules\.optilens-launcher-lock.sha256" set "NEEDS_INSTALL=1"

set "LOCK_HASH="
for /f "tokens=1" %%H in ('certutil -hashfile package-lock.json SHA256 2^>nul ^| findstr /r "^[0-9A-F][0-9A-F]"') do if not defined LOCK_HASH set "LOCK_HASH=%%H"
if not defined LOCK_HASH set "NEEDS_INSTALL=1"

set "OLD_LOCK_HASH="
if exist "node_modules\.optilens-launcher-lock.sha256" set /p OLD_LOCK_HASH=<"node_modules\.optilens-launcher-lock.sha256"
if defined LOCK_HASH if not "%OLD_LOCK_HASH%"=="%LOCK_HASH%" set "NEEDS_INSTALL=1"

if "%NEEDS_INSTALL%"=="1" (
  echo Installing project dependencies...
  call %NPM_CMD% ci --no-audit --no-fund
  if not exist "node_modules\.bin\vite.cmd" (
    echo npm ci did not leave a complete dependency install. Trying npm install...
    call %NPM_CMD% install --no-audit --no-fund
  )
  if not exist "node_modules\.bin\vite.cmd" (
    echo.
    echo [ERROR] Dependency installation failed. See the npm output above.
    echo.
    exit /b 1
  )
  if defined LOCK_HASH >"node_modules\.optilens-launcher-lock.sha256" echo %LOCK_HASH%
) else (
  echo Project dependencies are already installed.
)

exit /b 0

:BuildSite
echo Building the site for local preview...
call %NPM_CMD% run build
if errorlevel 1 (
  echo.
  echo [ERROR] Build failed. Fix the errors above, then run this launcher again.
  echo.
  exit /b 1
)
exit /b 0

:RefreshPath
for %%P in ("%ProgramFiles%\nodejs" "%APPDATA%\npm" "%ProgramFiles%\nvm" "%APPDATA%\nvm" "%LOCALAPPDATA%\Programs\nvm" "%NVM_HOME%" "%NVM_SYMLINK%") do (
  if not "%%~P"=="" if exist "%%~P" set "PATH=%PATH%;%%~P"
)
exit /b 0

:UseInstalledNode22
set "NODE22_DIR="
for /f "delims=" %%P in ('where node 2^>nul') do (
  echo %%~fP | findstr /i "OpenJS.NodeJS.22 node-v22" >nul && set "NODE22_DIR=%%~dpP"
)

if not defined NODE22_DIR (
  for /d %%D in ("%LOCALAPPDATA%\Microsoft\WinGet\Packages\OpenJS.NodeJS.22*_Microsoft.Winget.Source_*") do (
    for /r "%%~fD" %%P in (node.exe) do (
      if not defined NODE22_DIR set "NODE22_DIR=%%~dpP"
    )
  )
)

if not defined NODE22_DIR exit /b 1
set "PATH=%NODE22_DIR%;%PATH%"
exit /b 0
