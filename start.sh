#!/bin/bash
# AI4BRAIN Launch Script (IEEE CISTAC 1.0)

echo "Starting AI4BRAIN System..."

# 1. Start FastAPI Backend
echo "Starting FastAPI Backend on http://localhost:8000..."
source backend/.venv/bin/activate
PYTHONPATH=backend python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload &
BACKEND_PID=$!

# 2. Start Next.js Frontend
echo "Starting Next.js Frontend on http://localhost:3000..."
cd frontend
npm run dev &
FRONTEND_PID=$!

echo "All services started!"
echo "Open your browser at: http://localhost:3000"
echo "Press CTRL+C to stop all servers."

trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
