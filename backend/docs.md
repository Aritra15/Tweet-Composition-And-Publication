# Tweet Composer API — Documentation

**Base URL:** `http://localhost:8000/api/v1`

---

## Quick Reference — All Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| **System** | | |
| GET | `/health` | Basic API health check |
| **Tweets** | | |
| POST | `/tweets` | Create base tweet record (text + user only) |
| GET | `/tweets` | Get latest tweets across all users |
| GET | `/tweets/{tweet_id}` | Get tweet by ID |
| GET | `/tweets/user/{user_id}` | Get user's tweets |
| DELETE | `/tweets/{tweet_id}` | Delete tweet (cascades media, polls) |
| POST | `/tweets/stub` | Legacy stub tweet create |
| **Media** | | |
| POST | `/media` | Add single media to tweet |
| POST | `/media/bulk/{tweet_id}` | Add multiple media to tweet |
| GET | `/media/tweet/{tweet_id}` | Get all media for tweet |
| GET | `/media/tweet/{tweet_id}/metadata` | Get media metadata only (no URL data) |
| DELETE | `/media/{media_id}` | Delete media item |
| **Polls** | | |
| POST | `/polls` | Create poll for existing tweet |
| POST | `/polls/{poll_id}/options` | Add one option to existing poll |
| **AI** | | |
| GET | `/ai/health-gemma` | OpenRouter health check |
| POST | `/ai/enhance-text` | Enhance tweet text |
| POST | `/ai/suggest-hashtags` | Suggest hashtags for tweet text |
| POST | `/ai/generate-image` | Generate AI image (auto-enhances prompt) |

---

## Architecture Overview

### Media Storage

All media (images and videos) submitted as base64 data URLs are **automatically uploaded to Supabase Storage** when using media attach endpoints (`POST /media`, `POST /media/bulk/{tweet_id}`). The database stores only the resulting short `https://` public URL — never the raw base64. This keeps the database lean and API responses fast.

Supported MIME types and their stored extensions:

| MIME Type | Extension |
|-----------|-----------|
| image/png | .png |
| image/jpeg | .jpg |
| image/gif | .gif |
| image/webp | .webp |
| video/mp4 | .mp4 |
| video/webm | .webm |
| video/quicktime | .mov |
| video/x-msvideo | .avi |

External URLs (`https://`) are stored as-is without re-uploading.

### Poll Support

Tweets can optionally include a poll. Polls are stored in a separate `polls` table and their options in `poll_options`. Both are fetched and returned with every tweet response.

### Optimized Feed Query

`GET /tweets` uses a bulk fetch strategy — 3 database calls total regardless of how many tweets are returned, instead of N×3 calls. Media and poll data are fetched in bulk and joined in memory.

---

## System Endpoint

### Health Check

**Endpoint:** `GET /health`

**URL:** `http://localhost:8000/api/v1/health`

**Description:** Basic API liveness check.

**Response:**
```json
{
  "status": "ok"
}
```

---

## AI Endpoints

Base URL: `http://localhost:8000/api/v1/ai`

---

### 1. Health Check

**Endpoint:** `GET /health-gemma`

**URL:** `http://localhost:8000/api/v1/ai/health-gemma`

**Description:** Check OpenRouter API connectivity and model availability.

**Response:**
```json
{
  "status": "ok",
  "model": "google/gemma-3-4b-it:free",
  "test_response": "OK"
}
```

**Error Response:**
```json
{
  "status": "error",
  "message": "Error description"
}
```

---

### 2. Enhance Text

**Endpoint:** `POST /enhance-text`

**URL:** `http://localhost:8000/api/v1/ai/enhance-text`

**Description:** Improves tweet text with grammatical corrections, better sentence structure, and cleaner punctuation while preserving the original meaning and tone.

**Request Body:**
```json
{
  "text": "your text to enhance here"
}
```

**Response:**
```json
{
  "enhanced": "Your enhanced text with corrections and improvements."
}
```

**Example:**
```bash
curl -X POST "http://localhost:8000/api/v1/ai/enhance-text" \
  -H "Content-Type: application/json" \
  -d '{"text": "this is a example text that need fixing"}'
```

---

### 3. Suggest Hashtags

**Endpoint:** `POST /suggest-hashtags`

**URL:** `http://localhost:8000/api/v1/ai/suggest-hashtags`

**Description:** Suggests up to 7 relevant hashtags for the provided tweet text. Returns deduplicated, properly formatted hashtags.

**Request Body:**
```json
{
  "text": "your tweet text"
}
```

**Response:**
```json
{
  "hashtags": ["#AI", "#Tech", "#WebDev"]
}
```

**Notes:**
- Returns an empty array if `text` is blank
- Hashtags are deduplicated (case-insensitive)
- Each hashtag is guaranteed to start with `#`

**Example:**
```bash
curl -X POST "http://localhost:8000/api/v1/ai/suggest-hashtags" \
  -H "Content-Type: application/json" \
  -d '{"text": "Building a tweet composer with AI tools"}'
```

---

### 4. Generate Image

**Endpoint:** `POST /generate-image`

**URL:** `http://localhost:8000/api/v1/ai/generate-image`

**Description:** Generates an AI image using the Flux model via OpenRouter. The backend **automatically enhances the prompt** before generation. Returns base64 image data suitable for direct display or attaching to a tweet.

**Request Body:**
```json
{
  "prompt": "a beautiful sunset over mountains"
}
```

**Response:**
```json
{
  "filename": "generated_20260323_123456_789012.png",
  "image_data": "iVBORw0KGgoAAAANSUhEUgAA...",
  "image_url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "prompt": "Enhanced detailed prompt used for generation",
  "original_prompt": "a beautiful sunset over mountains"
}
```

**Response Fields:**
- `filename` — Timestamp-based suggested filename
- `image_data` — Raw base64 string without the data URL prefix
- `image_url` — Full data URL, usable directly in `<img src="...">` or as tweet media
- `prompt` — The enhanced prompt actually sent to the model
- `original_prompt` — The original input before enhancement

**Notes:**
- Timeout: 120 seconds
- `image_url` should be attached using `/media` or `/media/bulk/{tweet_id}` after creating a base tweet

**Example:**
```bash
curl -X POST "http://localhost:8000/api/v1/ai/generate-image" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "a red apple on a wooden table"}'
```

---

## Tweet Endpoints

Base URL: `http://localhost:8000/api/v1/tweets`

---

### 1. Create Tweet

**Endpoint:** `POST /`

**URL:** `http://localhost:8000/api/v1/tweets`

**Description:** Creates a base tweet record only. Media and poll are attached in separate API calls.

**Request Body:**
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "text": "Your tweet text here"
}
```

**Parameters:**
- `user_id` (string, required): UUID — must exist in `users` table
- `text` (string, required): 1–280 characters

**Response (201):**
```json
{
  "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "text": "Your tweet text here",
  "created_at": "2026-03-23T10:30:00.000Z",
  "media": [],
  "poll": null
}
```

**Example:**
```bash
curl -X POST "http://localhost:8000/api/v1/tweets" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "text": "Check out this AI image!"
  }'
```

---

## Poll Endpoints

Base URL: `http://localhost:8000/api/v1/polls`

### 1. Create Poll

**Endpoint:** `POST /`

**URL:** `http://localhost:8000/api/v1/polls`

**Description:** Creates a poll for an existing tweet.

**Request Body:**
```json
{
  "tweet_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "question": "Which feature should we ship first?"
}
```

**Response (201):** Poll object with empty options list.

### 2. Add Poll Option

**Endpoint:** `POST /{poll_id}/options`

**URL:** `http://localhost:8000/api/v1/polls/{poll_id}/options`

**Description:** Adds one option to an existing poll. Option `position` is auto-assigned.

**Request Body:**
```json
{
  "text": "AI images"
}
```

**Notes:**
- Maximum 4 options per poll
- Poll must exist

---

### 2. Get Latest Tweets

**Endpoint:** `GET /`

**URL:** `http://localhost:8000/api/v1/tweets`

**Description:** Returns the latest tweets across all users, ordered newest first. Uses a bulk-fetch strategy (3 DB calls total) for fast performance. Each tweet includes its media and poll.

**Query Parameters:**
- `limit` (integer, optional): 1–100, default `15`
- `offset` (integer, optional): default `0`

**Response (200):** Array of tweet objects (same shape as Create Tweet response)

**Example:**
```bash
curl "http://localhost:8000/api/v1/tweets?limit=15&offset=0"
```

---

### 3. Get Tweet by ID

**Endpoint:** `GET /{tweet_id}`

**URL:** `http://localhost:8000/api/v1/tweets/{tweet_id}`

**Description:** Fetches a single tweet by ID including all media and poll data.

**Response (200):** Single tweet object

**Error (404):**
```json
{ "detail": "Tweet not found" }
```

**Example:**
```bash
curl "http://localhost:8000/api/v1/tweets/7c9e6679-7425-40de-944b-e07fc1f90ae7"
```

---

### 4. Get User Tweets

**Endpoint:** `GET /user/{user_id}`

**URL:** `http://localhost:8000/api/v1/tweets/user/{user_id}`

**Description:** Returns all tweets by a specific user, ordered newest first. Supports pagination.

**Query Parameters:**
- `limit` (integer, optional): 1–100, default `50`
- `offset` (integer, optional): default `0`

**Response (200):** Array of tweet objects

**Example:**
```bash
curl "http://localhost:8000/api/v1/tweets/user/550e8400-e29b-41d4-a716-446655440000?limit=10&offset=0"
```

---

### 5. Delete Tweet

**Endpoint:** `DELETE /{tweet_id}`

**URL:** `http://localhost:8000/api/v1/tweets/{tweet_id}`

**Description:** Deletes a tweet. All associated media, polls, and poll options are automatically deleted via database cascade. Note: files in Supabase Storage are not deleted, only the database record.

**Response (200):**
```json
{
  "message": "Tweet deleted successfully",
  "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7"
}
```

**Example:**
```bash
curl -X DELETE "http://localhost:8000/api/v1/tweets/7c9e6679-7425-40de-944b-e07fc1f90ae7"
```

---

### 6. Legacy Stub Endpoint

**Endpoint:** `POST /stub`

**URL:** `http://localhost:8000/api/v1/tweets/stub`

**Description:** Returns a fake tweet stub without touching the database. Kept for backward compatibility only — do not use for new features.

---

## Media Endpoints

Base URL: `http://localhost:8000/api/v1/media`

---

### 1. Add Single Media

**Endpoint:** `POST /`

**URL:** `http://localhost:8000/api/v1/media`

**Description:** Adds a single media item to an existing tweet.

**Request Body:**
```json
{
  "tweet_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "url": "https://example.com/image.png",
  "type": "image",
  "source": "upload",
  "alt_text": "Optional description"
}
```

**Response (201):** Single media object

---

### 2. Add Bulk Media

**Endpoint:** `POST /bulk/{tweet_id}`

**URL:** `http://localhost:8000/api/v1/media/bulk/{tweet_id}`

**Description:** Adds multiple media items to an existing tweet in one request.

**Request Body:** Array of media items (without `tweet_id` — it's in the path)
```json
[
  { "url": "https://...", "type": "image", "source": "upload" },
  { "url": "https://...", "type": "video", "source": "upload" }
]
```

**Response (201):** Array of media objects

---

### 3. Get Tweet Media

**Endpoint:** `GET /tweet/{tweet_id}`

**URL:** `http://localhost:8000/api/v1/media/tweet/{tweet_id}`

**Description:** Returns all media items for a specific tweet.

**Response (200):**
```json
[
  {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "tweet_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "url": "https://ikkrcytofoontvmxyhwh.supabase.co/storage/v1/object/public/media/tweets/uuid.png",
    "type": "image",
    "source": "upload",
    "alt_text": null,
    "created_at": "2026-03-23T10:30:00.000Z"
  }
]
```

---

### 4. Get Tweet Media Metadata

**Endpoint:** `GET /tweet/{tweet_id}/metadata`

**URL:** `http://localhost:8000/api/v1/media/tweet/{tweet_id}/metadata`

**Description:** Returns metadata for all media items without the URL content. Useful for debugging payload sizes.

**Response (200):**
```json
[
  {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "tweet_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "type": "image",
    "source": "upload",
    "alt_text": null,
    "created_at": "2026-03-23T10:30:00.000Z",
    "url_length": 128
  }
]
```

---

### 5. Delete Media

**Endpoint:** `DELETE /{media_id}`

**URL:** `http://localhost:8000/api/v1/media/{media_id}`

**Description:** Deletes a specific media item by ID. Removes the database record only — does not delete the file from Supabase Storage.

**Response (200):**
```json
{
  "message": "Media deleted successfully",
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

---

## Supabase Storage

Media files are stored in the `media` bucket under the `tweets/` folder with UUID-based filenames.

**Public URL format:**
```
https://ikkrcytofoontvmxyhwh.supabase.co/storage/v1/object/public/media/tweets/{uuid}.{ext}
```

**Required storage policies (run in SQL Editor):**
```sql
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'media');

CREATE POLICY "Service role can upload"
ON storage.objects FOR INSERT TO service_role
WITH CHECK (bucket_id = 'media');

CREATE POLICY "Service role can delete"
ON storage.objects FOR DELETE TO service_role
USING (bucket_id = 'media');
```

---

## Complete Workflow Example

### Post a tweet with an AI-generated image (staged)

**Step 1: Generate image**
```bash
curl -X POST "http://localhost:8000/api/v1/ai/generate-image" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "a sunset over mountains"}'
```
Save the `image_url` from the response.

**Step 2: Create base tweet**
```bash
curl -X POST "http://localhost:8000/api/v1/tweets" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "YOUR_USER_UUID",
    "text": "Beautiful AI sunset 🌅"
  }'
```

**Step 3: Attach media to that tweet**
```bash
curl -X POST "http://localhost:8000/api/v1/media/bulk/TWEET_ID" \
  -H "Content-Type: application/json" \
  -d '[{
    "url": "PASTE_IMAGE_URL_FROM_STEP_1",
    "type": "image",
    "source": "ai",
    "alt_text": "AI generated sunset"
  }]'
```
If the URL is base64, backend uploads it to Supabase Storage and stores a hosted `https://` URL in DB.

---

## Testing with Postman

### Prerequisites
1. Backend running: `python -m uvicorn app.main:app --reload`
2. `.env` configured with `SUPABASE_URL`, `SUPABASE_KEY`, and `OPENROUTER_API_KEY`
3. A test user exists in the `users` table in Supabase

### Recommended Test Sequence

1. **Health check** — `GET /api/v1/health` → expect `"status": "ok"`
2. **AI health** — `GET /api/v1/ai/health-gemma` → expect `"status": "ok"`
3. **Generate image** — `POST /api/v1/ai/generate-image` → save `image_url`
4. **Create base tweet** — `POST /api/v1/tweets` → save `id`
5. **Attach media** — `POST /api/v1/media` or `POST /api/v1/media/bulk/{tweet_id}`
6. **Create poll (optional)** — `POST /api/v1/polls`
7. **Add poll options (optional)** — `POST /api/v1/polls/{poll_id}/options`
8. **Get tweet** — `GET /api/v1/tweets/{id}` → verify media/poll data
9. **Delete tweet** — `DELETE /api/v1/tweets/{id}` → verify cascade deletes media and poll

### Atomicity Note for Staged Publish

Publishing is now multi-step. To keep state consistent:

1. Create base tweet
2. Attach media and/or poll data
3. If any later step fails, call `DELETE /tweets/{tweet_id}` to roll back the partial publish

This works because tweet deletion cascades to `media`, `polls`, and `poll_options`.

### Current Scope Note

Thread APIs are currently not active (`/tweets/thread` is commented out), so thread persistence is not part of this backend API scope yet.

---

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| `404 Not Found` | Wrong URL | All endpoints require `/api/v1/` prefix |
| `Foreign key constraint` | Invalid `user_id` | Create user in Supabase `users` table first |
| `Tweet not found` | Wrong ID or deleted | Verify with `GET /tweets/{id}` |
| `Poll already exists for this tweet` | Attempted second poll for same tweet | Use existing poll ID or delete poll with tweet |
| `A poll must have at least 2 options and can have at most 4 options` | Too many options added | Keep poll option count between 1 and 4 |
| `Failed to create tweet` | Text out of range or DB issue | Text must be 1–280 chars; check Supabase connection |
| `Storage upload failed` | Missing bucket or policy | Create `media` bucket and set storage policies |
| `500` on any endpoint | Misconfiguration | Check backend logs and `.env` values |
| Slow initial feed load | Large base64 stored in DB | Ensure storage upload is working; media should be `https://` URLs |

---

## Database Schema Reference

```sql
-- Core tables
tweets        (id, user_id, text, created_at)
media         (id, tweet_id, url, type, source, alt_text, created_at)
polls         (id, tweet_id, question, created_at)
poll_options  (id, poll_id, text, position, votes_count, created_at)

-- Cascade deletes:
-- Deleting a tweet → deletes its media, polls, poll_options
```