@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0.."
node scripts/dev-menu.mjs
if errorlevel 1 pause
