@echo off
title Fruit Shoot! Launcher

:: 1. Check if Python is installed/accessible
python --version >nul 2>&1
if %errorlevel% neq 0 (
    cls
    echo ========================================================
    echo  ERROR: Python is not found!
    echo ========================================================
    echo  To play this game, you need Python installed.
    echo  1. Go to python.org and download Python.
    echo  2. During installation, check "Add Python to PATH".
    echo ========================================================
    pause
    exit
)

:: 2. Inform the user
cls
echo ========================================================
echo  FRUIT SHOOT! SERVER RUNNING
echo ========================================================
echo  Your browser should open automatically.
echo  Keep this black window OPEN while playing.
echo  Close this window to stop the server.
echo ========================================================

:: 3. Open the default browser to localhost:8000
:: 3. Open the default browser to localhost:8000
:: We use 'start' to launch it without waiting for the server command
timeout /t 2 >nul
start "" "http://localhost:8000"

:: 4. Start the Python HTTP server on port 8000
python server.py