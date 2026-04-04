# CSE-326 Project — Tweet Composition and Publication

[![Netlify Status](https://api.netlify.com/api/v1/badges/46cc2ea5-6e12-4907-b9a2-4b964af21520/deploy-status)](https://app.netlify.com/projects/tweet-composition-and-publication-x/deploys)
![Render](https://img.shields.io/website?url=https%3A%2F%2Ftweet-composition-and-publication-x.onrender.com%2Fapi%2Fv1%2Fhealth&label=render&cacheSeconds=300)

This project implements the Tweet Composition and Publication module.

- **Frontend:** React + TypeScript + Vite — deployed on [Netlify](https://tweet-composition-and-publication-x.netlify.app)
- **Backend:** FastAPI — deployed on [Render](https://tweet-composition-and-publication-x.onrender.com)
- **Database:** Supabase

## Workspace Structure

```
.
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── CompositionPreview.tsx   # Live tweet preview while composing
│   │   │   ├── EmojiPicker.tsx          # Emoji selector for tweet text
│   │   │   ├── Feed.tsx                 # Tweet feed list and thread display
│   │   │   ├── MediaLightbox.tsx        # Full-screen image/video viewer
│   │   │   ├── Shared.tsx               # Reusable UI primitives (Button, Toast, etc.)
│   │   │   └── VideoPlayer.tsx          # In-feed video playback component
│   │   ├── screens/
│   │   │   ├── Auth.tsx                 # Login and registration screen
│   │   │   ├── Compose.tsx              # Tweet composition screen with AI tools
│   │   │   ├── Home.tsx                 # Main feed screen
│   │   │   └── Publish.tsx             # Review and publish screen (saves to backend)
│   │   ├── App.tsx                      # Root component, routing, and global state
│   │   ├── App.css
│   │   ├── index.css
│   │   ├── main.tsx                     # Vite entry point
│   │   └── types.ts                     # Shared TypeScript types and interfaces
│   ├── index.html
│   ├── netlify.toml                     # Netlify build and deploy config
│   ├── vite.config.ts
│   └── package.json
│
└── backend/
    ├── app/
    │   ├── api/v1/
    │   │   ├── endpoints/
    │   │   │   ├── ai.py                # AI endpoints (enhance text, hashtags, image gen)
    │   │   │   ├── auth.py              # Register and login endpoints
    │   │   │   ├── health.py            # Health check endpoint
    │   │   │   ├── media.py             # Media upload and attachment endpoints
    │   │   │   ├── polls.py             # Poll creation and options endpoints
    │   │   │   └── tweets.py            # Tweet CRUD endpoints
    │   │   └── router.py               # Registers all endpoint routers
    │   ├── core/
    │   │   └── config.py               # App settings loaded from environment variables
    │   ├── db/
    │   │   └── supabase.py             # Supabase client initialization
    │   ├── schemas/
    │   │   ├── auth.py                  # Pydantic models for auth requests/responses
    │   │   ├── media.py                 # Pydantic models for media
    │   │   └── tweet.py                 # Pydantic models for tweets and polls
    │   ├── services/
    │   │   ├── ai_service.py            # OpenRouter API integration (text, image AI)
    │   │   ├── auth_service.py          # JWT creation and user authentication logic
    │   │   ├── media_service.py         # Media record management in Supabase
    │   │   ├── poll_service.py          # Poll and poll option logic
    │   │   ├── storage_service.py       # File storage via Supabase Storage
    │   │   └── tweet_service.py         # Tweet creation, retrieval, deletion logic
    │   └── main.py                      # FastAPI app setup, CORS, and middleware
    ├── supabase/
    │   └── schema.sql                   # Database schema (run once in Supabase SQL editor)
    ├── scripts/
    │   └── check_supabase_connection.py # Dev utility to verify Supabase connectivity
    ├── tests/
    │   └── test_health.py
    ├── requirements.txt
    └── .env.example                     # Template for required environment variables
```

## Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Set `VITE_API_BASE_URL` in `frontend/.env.local` to point to the backend:

```
VITE_API_BASE_URL=http://localhost:8000
```

## Run Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Copy `.env.example` to `.env` and fill in your values.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/health` | Health check |
| POST | `/api/v1/auth/register` | Register user |
| POST | `/api/v1/auth/login` | Login |
| GET | `/api/v1/tweets` | Get tweet feed |
| POST | `/api/v1/tweets` | Create tweet |
| DELETE | `/api/v1/tweets/{id}` | Delete tweet |
| POST | `/api/v1/media/bulk/{tweet_id}` | Add media to tweet |
| POST | `/api/v1/polls` | Create poll |
| POST | `/api/v1/polls/{id}/options` | Add poll option |
| POST | `/api/v1/ai/enhance-text` | Enhance tweet text |
| POST | `/api/v1/ai/suggest-hashtags` | Suggest hashtags |
| POST | `/api/v1/ai/generate-image` | Generate image |

## Supabase Database Setup

SQL schema: `backend/supabase/schema.sql`

After setting `backend/.env` and running the SQL in your Supabase project:

```bash
cd backend
python scripts/check_supabase_connection.py
```
