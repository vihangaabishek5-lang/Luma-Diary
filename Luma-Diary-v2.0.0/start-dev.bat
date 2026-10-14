@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1 || (echo Please install Node.js LTS from https://nodejs.org/ & pause & exit /b 1)
if not exist node_modules (call npm install --no-audit --no-fund || (pause & exit /b 1))
call npm start
