#!/bin/bash
# Startup script for ForensiX backend

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Start the backend server
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
