@echo off
REM Compatibility entry point for the hyphenated project launcher.
call "%~dp0launch-site.bat" %*
exit /b %ERRORLEVEL%
