@echo off
cd /d "%~dp0"
where npm >nul 2>nul
if errorlevel 1 (
  echo Zainstaluj Node.js LTS z https://nodejs.org/
  pause
  exit /b 1
)
if not exist node_modules (
  echo Instalowanie zaleznosci...
  call npm install --no-audit --no-fund
  if errorlevel 1 (pause & exit /b 1)
)
echo Uruchamianie NOVA MEDIA PLAYER...
call npm start
if errorlevel 1 pause
