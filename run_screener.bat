@echo off
title Benjamin Graham Screener — S&P 500 + MidCap 400
color 0A
echo.
echo  ============================================================
echo   Benjamin Graham Screener — S&P 500 + S^&P MidCap 400
echo   ~900 acciones  /  Tiempo estimado: ~20 minutos
echo  ============================================================
echo.
echo  Si el proceso se interrumpe, vuelvelo a correr —
echo  reanuda automaticamente desde donde se quedo.
echo.
echo  Opciones:
echo    run_screener.bat          ^<-- reanudar / correr normal
echo    run_screener.bat --fresh  ^<-- empezar desde cero
echo.

cd /d "%~dp0"

python --version >nul 2>&1
if errorlevel 1 (
    echo  ERROR: Python no encontrado.
    echo  Instala Python 3.x desde python.org y agrega al PATH.
    pause
    exit /b 1
)

echo  Instalando / actualizando dependencias...
pip install yfinance pandas requests --quiet --upgrade
echo.

python fetch_graham.py %*
echo.
pause
