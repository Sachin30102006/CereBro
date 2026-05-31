@echo off
echo Starting Cerebro Chatbot Servers...

echo [1/2] Starting Backend (FastAPI)...
start cmd /k "cd backend && .\venv\Scripts\uvicorn main:app --reload"

echo [2/2] Starting Frontend (Vite)...
start cmd /k "cd frontend && npm run dev"

echo Both servers are starting up in separate windows!
echo Once they load, you can access the app at: http://localhost:5173/
pause
