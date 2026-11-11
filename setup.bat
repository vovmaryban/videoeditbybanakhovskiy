@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Video Studio - встановлення

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Потрібен Node.js 22 LTS. Завантаж і встанови з https://nodejs.org , потім запусти setup.bat ще раз.
  echo.
  start "" https://nodejs.org/en/download
  pause
  exit /b 1
)

echo.
echo  [1/2] Встановлюю бібліотеки (кілька хвилин)...
call npm install --no-audit --no-fund
if errorlevel 1 goto :err

echo.
echo  [2/2] Встановлюю розпізнавання мови (whisper.cpp + модель ~550 МБ, один раз)...
call npm run setup:whisper
if errorlevel 1 goto :err

echo.
echo  Готово! Тепер запускай start.bat
echo.
pause
exit /b 0

:err
echo.
echo  Щось пішло не так. Скопіюй текст вище і надішли Claude.
pause
exit /b 1
