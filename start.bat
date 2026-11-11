@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Video Studio

if not exist node_modules (
  echo  Спершу запусти setup.bat
  pause
  exit /b 1
)

echo.
echo  Збираю інтерфейс...
call npx vite build --logLevel warn
if errorlevel 1 goto :err

echo.
echo  Студія відкриється в браузері: http://localhost:4610
echo  Не закривай це вікно, поки працюєш. Закрив вікно = вимкнув студію.
echo.
start "" cmd /c "timeout /t 3 >nul & start http://localhost:4610"
call npx tsx server/index.ts --prod
goto :eof

:err
echo.
echo  Помилка запуску. Скопіюй текст вище і надішли Claude.
pause
