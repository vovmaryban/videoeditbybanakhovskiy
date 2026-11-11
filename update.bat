@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Video Studio - оновлення

where git >nul 2>nul
if errorlevel 1 (
  echo  Для оновлення потрібен Git: https://git-scm.com/download/win
  pause
  exit /b 1
)
echo  Забираю нову версію з GitHub...
git pull
if errorlevel 1 goto :err
call npm install --no-audit --no-fund
if errorlevel 1 goto :err
echo.
echo  Оновлено. Твої проєкти в папці data не чіпались. Запускай start.bat
pause
exit /b 0

:err
echo  Помилка оновлення. Скопіюй текст вище і надішли Claude.
pause
exit /b 1
