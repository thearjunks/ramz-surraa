@echo off
title SURRAA CMS - http://localhost:43678/cms/
rem Double-click to start the SURRAA website and open the CMS (content manager) in your browser.
rem Close this window (or press Ctrl+C) to stop the website.
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js is not installed.
  echo  Install the LTS version from https://nodejs.org , then double-click this file again.
  echo.
  start "" https://nodejs.org
  pause
  exit /b 1
)
for /f "tokens=1 delims=v." %%v in ('node -v') do set NODEMAJOR=%%v
if %NODEMAJOR% LSS 22 (
  echo.
  echo  This website needs Node.js 22.13 or newer, 24 LTS recommended. You have:
  node -v
  echo  Install the LTS version from https://nodejs.org , then try again.
  start "" https://nodejs.org
  pause
  exit /b 1
)

if not exist "node_modules\next\package.json" (
  echo  First run: installing packages, please wait 1-2 minutes...
  call npm install
  if errorlevel 1 (
    echo.
    echo  Package install failed. Check your internet connection and try again.
    pause
    exit /b 1
  )
)

rem Free port 43678 if an older copy of the website is still running
set OLDPID=
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /r /c:":43678 .*LISTENING"') do set OLDPID=%%a
if defined OLDPID (
  echo.
  echo  Another website is already running on port 43678 (process %OLDPID%^).
  choice /c YN /m " Stop it and start the SURRAA platform"
  if errorlevel 2 exit /b 1
  taskkill /PID %OLDPID% /F >nul 2>nul
  timeout /t 2 /nobreak >nul
)

rem Open the browser as soon as the site is ready
start "" /min powershell -NoProfile -WindowStyle Hidden -Command "for($i=0;$i -lt 180;$i++){try{$null=Invoke-WebRequest http://localhost:43678 -UseBasicParsing -TimeoutSec 60;break}catch{Start-Sleep 1}}; Start-Process http://localhost:43678/cms/"

echo.
echo  Starting SURRAA...
echo.
echo    Website          http://localhost:43678/
echo    Website CMS      http://localhost:43678/cms/
echo    Bookings admin   http://localhost:43678/admin/
echo  Keep this window open. Close it to stop the website.
echo.
call npm run dev

echo.
echo  The website has stopped. If you see "address already in use", the site is already
echo  running in another window - just open http://localhost:43678
pause

