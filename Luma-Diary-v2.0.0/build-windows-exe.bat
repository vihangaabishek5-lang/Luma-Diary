@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1 || (echo Please install Node.js LTS from https://nodejs.org/ & pause & exit /b 1)
call npm install --no-audit --no-fund || (pause & exit /b 1)
call npm test || (pause & exit /b 1)
call npm run configure || (pause & exit /b 1)
call npm run build:win || (pause & exit /b 1)
echo.
echo Done. Open the dist folder for your Setup .exe file.
pause
