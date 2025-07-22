@echo off
echo Starting Kushima Sugoroku Development Servers...
echo.

echo Starting Backend Server...
start /b cmd /c "cd server && npm install && npm run dev"

timeout /t 5 /nobreak >nul

echo Starting Frontend Server...
start /b cmd /c "npm install && npm run dev"

echo.
echo Both servers are starting...
echo Frontend: http://localhost:5173
echo Backend: http://localhost:3001
echo.
pause