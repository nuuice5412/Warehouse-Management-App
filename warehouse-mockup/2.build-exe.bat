@echo off
cd /d "%~dp0"
echo Building Windows EXE installer and portable package...
npm run build
