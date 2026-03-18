# Backend Setup (FastAPI)

This backend is a base scaffold for the Tweet Composition and Publication module.

## Folder Layout

backend/
|- app/
|  |- api/v1/endpoints/
|  |- core/
|  |- schemas/
|  |- services/
|  |- main.py
|- tests/
|- requirements.txt
|- .env.example

## Quick Start

1. Create and activate a virtual environment.
2. Install dependencies.
3. Start the FastAPI dev server.

### Windows PowerShell

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### API URLs

- Health check: http://localhost:8000/api/v1/health
- Swagger docs: http://localhost:8000/docs

## Current Scope

- Includes a health endpoint and a stub tweet creation endpoint.
- No database or authentication is connected yet.
