# Backend Setup (FastAPI)

This backend is a base scaffold for the Tweet Composition and Publication module.

## Folder Layout
```
backend/
|- app/
|  |- api/v1/endpoints/
|  |- core/
|  |- db/
|  |- schemas/
|  |- services/
|  |- main.py
|- scripts/
|- supabase/
|- tests/
|- requirements.txt
|- .env.example
```
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
- Supabase connection utilities and schema file are configured.
- Authentication and business logic integration are not connected yet.

## Supabase Setup

1. Copy environment template and fill Supabase values.

```powershell
cd backend
Copy-Item .env.example .env
```

Required values in .env:

- SUPABASE_URL
- SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY)

Note:

- Use SUPABASE_SERVICE_ROLE_KEY for backend server tasks when needed.
- Do not expose SUPABASE_SERVICE_ROLE_KEY in frontend code.

2. Create tables in Supabase SQL Editor:

- Open the SQL editor in your Supabase project.
- Run the SQL from backend/supabase/schema.sql

3. Verify backend can access Supabase:

```powershell
cd backend
python scripts/check_supabase_connection.py
```

If successful, the script prints:

- Supabase connection OK
- users table reachable
