# CSE-326 Project

This project implements the Tweet Composition and Publication module.

## Current Base Setup

- frontend: Vite + React + TypeScript with a minimal tweet composer UI
- backend: FastAPI scaffold with versioned API routes, stub tweet endpoint, and Supabase connection setup

## Workspace Structure

.
|- frontend/
|- backend/

## Run Frontend

```bash
cd frontend
npm install
npm run dev
```

## Run Backend

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## API Endpoints (Current)

- GET /api/v1/health
- POST /api/v1/tweets

## Supabase Database Setup

- SQL schema file: backend/supabase/schema.sql
- Backend Supabase client: backend/app/db/supabase.py
- Environment template includes required variables in backend/.env.example

After setting backend/.env and running the SQL in your Supabase project, verify connection with:

```bash
cd backend
python scripts/check_supabase_connection.py
```

