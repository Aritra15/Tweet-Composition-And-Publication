## Quick Reference - All Endpoints

**Base URL:** `http://localhost:8000/api/v1`

| Method | Endpoint | Description |
|--------|----------|-------------|
| **System** | | |
| GET | `/health` | Basic API health check |
| **Tweets** | | |
| POST | `/tweets` | Create tweet with media |
| GET | `/tweets` | Get latest tweets across all users |
| GET | `/tweets/{tweet_id}` | Get tweet by ID |
| GET | `/tweets/user/{user_id}` | Get user's tweets |
| DELETE | `/tweets/{tweet_id}` | Delete tweet |
| POST | `/tweets/stub` | Legacy stub tweet create |
| **Media** | | |
| POST | `/media` | Add single media to tweet |
| POST | `/media/bulk/{tweet_id}` | Add multiple media to tweet |
| GET | `/media/tweet/{tweet_id}` | Get all media for tweet |
| GET | `/media/tweet/{tweet_id}/metadata` | Get media metadata only |
| DELETE | `/media/{media_id}` | Delete media |
| **AI** | | |
| GET | `/ai/health-gemma` | Health check |
| POST | `/ai/enhance-text` | Enhance text |
| POST | `/ai/suggest-hashtags` | Suggest hashtags |
| POST | `/ai/generate-image` | Generate AI image |

---

## System Endpoint

Base URL: `http://localhost:8000/api/v1`

---

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

**Description:** Check OpenRouter API connectivity and configuration.

**Request:** No request body required.

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

**Description:** Enhance text with grammatical corrections, improved sentence structure, and better clarity.

**Request Body:**
```json
{
  "text": "your text to enhance here"
}
```

**Response:**
```json
{
  "enhanced": "Your enhanced text with corrections and improvements"
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

**Description:** Suggest up to 7 relevant hashtags for the provided tweet text.

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

**Description:** Generate an image using the Flux 2 Klein 4B model from OpenRouter. The backend automatically enhances the prompt before generation, and returns image data suitable for frontend storage and display.

**Request Body:**
```json
{
  "prompt": "your image generation prompt"
}
```

**Parameters:**
- `prompt` (string, required): The image generation prompt

**Response:**
```json
{
  "filename": "generated_20260323_123456_789012.png",
  "image_data": "iVBORw0KGgoAAAANSUhEUgAA...",
  "image_url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "prompt": "Enhanced detailed prompt used for generation",
  "original_prompt": "your original simple prompt"
}
```

**Response Fields:**
- `filename`: Suggested filename for the generated image (timestamp-based)
- `image_data`: Base64-encoded image data (without data URL prefix)
- `image_url`: Complete data URL that can be directly used in `<img>` tags or Canvas API
- `prompt`: The enhanced prompt used for generation
- `original_prompt`: The original prompt before enhancement

**Example:**
```bash
curl -X POST "http://localhost:8000/api/v1/ai/generate-image" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "a beautiful sunset over mountains"}'
```

**Frontend Integration Guide:**

1. **Display Preview in UI:**
   ```javascript
   // Use the image_url directly in an img tag
   const imageElement = document.createElement('img');
   imageElement.src = response.image_url;
   ```

2. **Store in Browser Storage:**
   ```javascript
   // Option 1: localStorage (for smaller images, < 5MB)
   localStorage.setItem(`image_${response.filename}`, response.image_data);

   // Option 2: IndexedDB (recommended for larger images)
   const db = await openDB('images-db', 1, {
     upgrade(db) {
       db.createObjectStore('images');
     }
   });
   await db.put('images', {
     filename: response.filename,
     data: response.image_data,
     url: response.image_url,
     timestamp: Date.now()
   }, response.filename);
   ```

3. **Download Image:**
   ```javascript
   // Convert to blob and download
   const blob = await fetch(response.image_url).then(r => r.blob());
   const link = document.createElement('a');
   link.href = URL.createObjectURL(blob);
   link.download = response.filename;
   link.click();
   ```

4. **Upload to Server Later (if needed):**
   ```javascript
   // Convert base64 to File object
   const blob = await fetch(response.image_url).then(r => r.blob());
   const file = new File([blob], response.filename, { type: 'image/png' });

   // Upload using FormData
   const formData = new FormData();
   formData.append('image', file);
   await fetch('/api/upload', { method: 'POST', body: formData });
   ```

**Notes:**
- Images are returned as base64-encoded PNG data
- During tweet creation, base64 data URLs are uploaded to storage and persisted as regular hosted URLs
- Timeout: 120 seconds
- The `prompt` field in the response contains the enhanced prompt used for generation
- The `original_prompt` field contains the original input prompt
- Recommended to use IndexedDB for storing images in the browser to avoid localStorage size limitations

---

## Tweet Endpoints

Base URL: `http://localhost:8000/api/v1/tweets`

---

### 1. Create Tweet

**Endpoint:** `POST /`

**URL:** `http://localhost:8000/api/v1/tweets`

**Description:** Create a new tweet with optional media attachments and optional poll. The tweet is stored in Supabase with all associated media and poll records.

**Request Body:**
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "text": "Your tweet text here (1-280 characters)",
  "media": [
    {
      "url": "data:image/png;base64,iVBORw0KGgoAAAA...",
      "type": "image",
      "source": "ai",
      "alt_text": "Description of the image"
    }
  ],
  "poll": {
    "question": "Which feature should we ship first?",
    "options": [
      { "text": "AI images" },
      { "text": "Poll scheduling" }
    ]
  }
}
```

**Parameters:**
- `user_id` (string, required): UUID of the user creating the tweet
- `text` (string, required): Tweet text (1-280 characters)
- `media` (array, optional): List of media items to attach
  - `url` (string, required): Media URL (can be base64 data URL or external URL)
  - `type` (string, required): Either "image" or "video"
  - `source` (string, required): Either "ai" (AI-generated) or "upload" (user uploaded)
  - `alt_text` (string, optional): Accessibility description
- `poll` (object, optional): Poll to attach to the tweet
  - `question` (string, required when poll provided): 1-280 chars
  - `options` (array, required when poll provided): 2-4 options
    - `text` (string, required): 1-100 chars

**Response:**
```json
{
  "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "text": "Your tweet text here",
  "created_at": "2026-03-23T10:30:00.000Z",
  "media": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "tweet_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "url": "https://<project>.supabase.co/storage/v1/object/public/tweets/...png",
      "type": "image",
      "source": "ai",
      "alt_text": "Description of the image",
      "created_at": "2026-03-23T10:30:00.000Z"
    }
  ],
  "poll": {
    "id": "2d7b3ef4-39c8-4df2-9c9c-9cb87f2fb06b",
    "tweet_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "question": "Which feature should we ship first?",
    "created_at": "2026-03-23T10:30:00.000Z",
    "options": [
      {
        "id": "opt-1",
        "poll_id": "2d7b3ef4-39c8-4df2-9c9c-9cb87f2fb06b",
        "text": "AI images",
        "position": 1,
        "votes_count": 0,
        "created_at": "2026-03-23T10:30:00.000Z"
      }
    ]
  }
}
```

**Example:**
```bash
curl -X POST "http://localhost:8000/api/v1/tweets" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "text": "Check out this AI-generated image!",
    "media": [{
      "url": "data:image/png;base64,iVBORw0KG...",
      "type": "image",
      "source": "ai",
      "alt_text": "A beautiful sunset over mountains"
    }]
  }'
```

---

### 2. Get Tweet by ID

**Endpoint:** `GET /{tweet_id}`

**URL:** `http://localhost:8000/api/v1/tweets/{tweet_id}`

**Description:** Retrieve a specific tweet by its ID, including all associated media.

**Path Parameters:**
- `tweet_id` (string, required): UUID of the tweet

**Response:**
```json
{
  "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "text": "Your tweet text here",
  "created_at": "2026-03-23T10:30:00.000Z",
  "media": [...]
}
```

**Example:**
```bash
curl "http://localhost:8000/api/v1/tweets/7c9e6679-7425-40de-944b-e07fc1f90ae7"
```

---

### 3. Get Latest Tweets

**Endpoint:** `GET /`

**URL:** `http://localhost:8000/api/v1/tweets`

**Description:** Get latest tweets across all users, ordered by creation date (newest first). Supports pagination.

**Query Parameters:**
- `limit` (integer, optional, default: 15): Maximum number of tweets to return (1-100)
- `offset` (integer, optional, default: 0): Number of tweets to skip

**Example:**
```bash
curl "http://localhost:8000/api/v1/tweets?limit=15&offset=0"
```

---

### 4. Get User Tweets

**Endpoint:** `GET /user/{user_id}`

**URL:** `http://localhost:8000/api/v1/tweets/user/{user_id}`

**Description:** Get all tweets for a specific user, ordered by creation date (newest first). Supports pagination.

**Path Parameters:**
- `user_id` (string, required): UUID of the user

**Query Parameters:**
- `limit` (integer, optional, default: 50): Maximum number of tweets to return (1-100)
- `offset` (integer, optional, default: 0): Number of tweets to skip (for pagination)

**Response:**
```json
[
  {
    "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "text": "First tweet",
    "created_at": "2026-03-23T10:30:00.000Z",
    "media": [...]
  },
  {
    "id": "8d0f7780-8536-51ef-a055-f18gd2g01bf8",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "text": "Second tweet",
    "created_at": "2026-03-23T09:15:00.000Z",
    "media": []
  }
]
```

**Example:**
```bash
# Get first 20 tweets
curl "http://localhost:8000/api/v1/tweets/user/550e8400-e29b-41d4-a716-446655440000?limit=20&offset=0"

# Get next 20 tweets (pagination)
curl "http://localhost:8000/api/v1/tweets/user/550e8400-e29b-41d4-a716-446655440000?limit=20&offset=20"
```

---

### 5. Delete Tweet

**Endpoint:** `DELETE /{tweet_id}`

**URL:** `http://localhost:8000/api/v1/tweets/{tweet_id}`

**Description:** Delete a tweet. All associated media will be automatically deleted (database cascade).

**Path Parameters:**
- `tweet_id` (string, required): UUID of the tweet to delete

**Response:**
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

### 6. Legacy Stub Tweet

**Endpoint:** `POST /stub`

**URL:** `http://localhost:8000/api/v1/tweets/stub`

**Description:** Legacy non-persistent endpoint kept for backward compatibility.

**Request Body:**
```json
{
  "text": "Draft text"
}
```

**Response:**
```json
{
  "id": "generated-uuid",
  "text": "Draft text",
  "message": "Stub response only. Persistence will be added later."
}
```

---

## Media Endpoints

Base URL: `http://localhost:8000/api/v1/media`

---

### 1. Add Media to Tweet

**Endpoint:** `POST /`

**URL:** `http://localhost:8000/api/v1/media`

**Description:** Add a single media item to an existing tweet.

**Request Body:**
```json
{
  "tweet_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "url": "data:image/png;base64,iVBORw0KGgoAAAA...",
  "type": "image",
  "source": "ai",
  "alt_text": "Optional description"
}
```

**Parameters:**
- `tweet_id` (string, required): UUID of the tweet to attach media to
- `url` (string, required): Media URL (can be base64 data URL or external URL)
- `type` (string, required): Either "image" or "video"
- `source` (string, required): Either "ai" or "upload"
- `alt_text` (string, optional): Accessibility description

**Response:**
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "tweet_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "url": "data:image/png;base64,iVBORw0KGgoAAAA...",
  "type": "image",
  "source": "ai",
  "alt_text": "Optional description",
  "created_at": "2026-03-23T10:35:00.000Z"
}
```

**Example:**
```bash
curl -X POST "http://localhost:8000/api/v1/media" \
  -H "Content-Type: application/json" \
  -d '{
    "tweet_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "url": "data:image/png;base64,iVBORw0KG...",
    "type": "image",
    "source": "upload"
  }'
```

---

### 2. Add Bulk Media to Tweet

**Endpoint:** `POST /bulk/{tweet_id}`

**URL:** `http://localhost:8000/api/v1/media/bulk/{tweet_id}`

**Description:** Add multiple media items to an existing tweet at once.

**Path Parameters:**
- `tweet_id` (string, required): UUID of the tweet

**Request Body:**
```json
[
  {
    "url": "data:image/png;base64,iVBORw0KGgoAAAA...",
    "type": "image",
    "source": "ai",
    "alt_text": "First image"
  },
  {
    "url": "data:image/jpeg;base64,/9j/4AAQSk...",
    "type": "image",
    "source": "upload",
    "alt_text": "Second image"
  }
]
```

**Response:**
```json
[
  {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "tweet_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "url": "data:image/png;base64,iVBORw0KGgoAAAA...",
    "type": "image",
    "source": "ai",
    "alt_text": "First image",
    "created_at": "2026-03-23T10:35:00.000Z"
  },
  {
    "id": "b2c3d4e5-f6a7-8901-bcde-fa2345678901",
    "tweet_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "url": "data:image/jpeg;base64,/9j/4AAQSk...",
    "type": "image",
    "source": "upload",
    "alt_text": "Second image",
    "created_at": "2026-03-23T10:35:01.000Z"
  }
]
```

**Example:**
```bash
curl -X POST "http://localhost:8000/api/v1/media/bulk/7c9e6679-7425-40de-944b-e07fc1f90ae7" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "url": "data:image/png;base64,iVBORw0KG...",
      "type": "image",
      "source": "ai"
    },
    {
      "url": "data:image/jpeg;base64,/9j/4AAQ...",
      "type": "image",
      "source": "upload"
    }
  ]'
```

---

### 3. Get Tweet Media

**Endpoint:** `GET /tweet/{tweet_id}`

**URL:** `http://localhost:8000/api/v1/media/tweet/{tweet_id}`

**Description:** Get all media items associated with a specific tweet.

**Path Parameters:**
- `tweet_id` (string, required): UUID of the tweet

**Response:**
```json
[
  {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "tweet_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "url": "data:image/png;base64,iVBORw0KGgoAAAA...",
    "type": "image",
    "source": "ai",
    "alt_text": "Description",
    "created_at": "2026-03-23T10:30:00.000Z"
  }
]
```

**Example:**
```bash
curl "http://localhost:8000/api/v1/media/tweet/7c9e6679-7425-40de-944b-e07fc1f90ae7"
```

---

### 4. Delete Media

**Endpoint:** `DELETE /{media_id}`

**URL:** `http://localhost:8000/api/v1/media/{media_id}`

**Description:** Delete a specific media item by its ID.

**Path Parameters:**
- `media_id` (string, required): UUID of the media item to delete

**Response:**
```json
{
  "message": "Media deleted successfully",
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

**Example:**
```bash
curl -X DELETE "http://localhost:8000/api/v1/media/a1b2c3d4-e5f6-7890-abcd-ef1234567890"
```

---

### 5. Get Tweet Media Metadata

**Endpoint:** `GET /tweet/{tweet_id}/metadata`

**URL:** `http://localhost:8000/api/v1/media/tweet/{tweet_id}/metadata`

**Description:** Get metadata for all media items without returning full URL/blob content. Useful for debugging payload sizes and media diagnostics.

**Response:**
```json
[
  {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "tweet_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "type": "image",
    "source": "ai",
    "alt_text": "Description",
    "created_at": "2026-03-23T10:30:00.000Z",
    "url_length": 128
  }
]
```

---

## Complete Workflow Example

Here's a complete workflow showing how to generate an AI image and create a tweet with it:

### Step 1: Generate AI Image
```bash
curl -X POST "http://localhost:8000/api/v1/ai/generate-image" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "a sunset over mountains"}'
```

**Response:** You'll get `image_url` and `image_data`

### Step 2: Create Tweet with Media
```bash
curl -X POST "http://localhost:8000/api/v1/tweets" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "YOUR_USER_ID",
    "text": "Beautiful sunset I generated with AI!",
    "media": [{
      "url": "IMAGE_URL_FROM_STEP_1",
      "type": "image",
      "source": "ai",
      "alt_text": "AI generated sunset over mountains"
    }]
  }'
```

### Alternative: Create Tweet First, Add Media Later

**Step 1:** Create tweet without media
```bash
curl -X POST "http://localhost:8000/api/v1/tweets" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "YOUR_USER_ID",
    "text": "My tweet text"
  }'
```

**Step 2:** Add media to the tweet
```bash
curl -X POST "http://localhost:8000/api/v1/media" \
  -H "Content-Type: application/json" \
  -d '{
    "tweet_id": "TWEET_ID_FROM_STEP_1",
    "url": "IMAGE_URL",
    "type": "image",
    "source": "ai"
  }'
```

---

## Testing with Postman

### Prerequisites
1. Ensure your backend is running: `python -m uvicorn app.main:app --reload`
2. Ensure Supabase is configured in `.env` file
3. **IMPORTANT:** Create a test user manually in Supabase `users` table:
   - Go to Supabase Dashboard → Table Editor → `users`
   - Click "Insert row"
   - Add: `username`, `email`, `password_hash` (any values for testing)
   - Copy the generated `id` (UUID) - this is your `user_id`

### Test Sequence

**1. Health Check (Verify API is running)**
- **Method:** GET
- **URL:** `http://localhost:8000/api/v1/ai/health-gemma`
- **Expected:** Status 200, `"status": "ok"`

**2. Generate Test Image**
- **Method:** POST
- **URL:** `http://localhost:8000/api/v1/ai/generate-image`
- **Body (JSON):**
  ```json
  {
    "prompt": "a red apple"
  }
  ```
- **Save:** Copy the `image_url` from the response for next step

**3. Create Tweet with Media**
- **Method:** POST
- **URL:** `http://localhost:8000/api/v1/tweets`
- **Body (JSON):**
  ```json
  {
    "user_id": "YOUR_USER_UUID_FROM_SUPABASE",
    "text": "Testing tweet creation with AI image",
    "media": [{
      "url": "PASTE_IMAGE_URL_HERE",
      "type": "image",
      "source": "ai",
      "alt_text": "Test image"
    }]
  }
  ```
- **Expected:** Status 201, returns tweet with `id` and `media` array
- **Verification:** Tweet is stored in Supabase `tweets` table, media in `media` table
- **Save:** Copy the `id` from response (tweet_id)

**4. Get Tweet by ID**
- **Method:** GET
- **URL:** `http://localhost:8000/api/v1/tweets/{tweet_id}`
- **Expected:** Returns the tweet you just created with media
- **Verification:** Media array should contain the image you added

**5. Get User Tweets**
- **Method:** GET
- **URL:** `http://localhost:8000/api/v1/tweets/user/{user_id}?limit=10&offset=0`
- **Expected:** Returns array of tweets for that user
- **Verification:** Your test tweet should be in the list

**6. Add Additional Media to Tweet**
- **Method:** POST
- **URL:** `http://localhost:8000/api/v1/media` (NOT `/mediaBody`)
- **Body (JSON):**
  ```json
  {
    "tweet_id": "YOUR_TWEET_ID",
    "url": "data:image/png;base64,iVBORw0KGgoAAAA...",
    "type": "image",
    "source": "upload",
    "alt_text": "Another test image"
  }
  ```
- **Expected:** Returns the new media item with `id`
- **Verification:** Query tweet again to see 2 media items

**7. Get Tweet Media**
- **Method:** GET
- **URL:** `http://localhost:8000/api/v1/media/tweet/{tweet_id}`
- **Expected:** Returns array of all media for this tweet
- **Verification:** Should show all media items added

**8. Delete Media**
- **Method:** DELETE
- **URL:** `http://localhost:8000/api/v1/media/{media_id}`
- **Expected:** Status 200, confirmation message
- **Verification:** Query tweet media again, item should be gone

**9. Delete Tweet**
- **Method:** DELETE
- **URL:** `http://localhost:8000/api/v1/tweets/{tweet_id}`
- **Expected:** Status 200, confirmation message
- **Verification:** All associated media should also be deleted (cascade)

### Verification Methods

**Option 1: Check via Postman (Recommended)**
- After creating a tweet, use the GET endpoints to verify it was stored correctly
- Use GET `/tweets/{tweet_id}` to see the full tweet with media
- Use GET `/tweets/user/{user_id}` to see all user tweets

**Option 2: Check Supabase Dashboard**
1. Go to your Supabase project dashboard
2. Navigate to Table Editor
3. Open `tweets` table → verify your tweet is there
4. Open `media` table → verify media items are linked to tweet_id
5. After deletion, verify records are removed

**Option 3: Direct SQL Query (Advanced)**
```sql
-- Check tweets
SELECT * FROM tweets WHERE user_id = 'YOUR_USER_ID';

-- Check media for a tweet
SELECT * FROM media WHERE tweet_id = 'YOUR_TWEET_ID';

-- Check tweet with media (JOIN)
SELECT t.*, m.url, m.type, m.source
FROM tweets t
LEFT JOIN media m ON t.id = m.tweet_id
WHERE t.id = 'YOUR_TWEET_ID';
```

### Common Issues & Solutions

**Issue:** `404 Not Found` error
- **Solution:** Check your endpoint URL carefully:
  - ✅ Correct: `http://localhost:8000/api/v1/media`
  - ❌ Wrong: `http://localhost:8000/api/v1/mediaBody`
  - ❌ Wrong: `http://localhost:8000/media`
- **All endpoints must include `/api/v1/` prefix**

**Issue:** `Foreign key constraint violation` (user_id not found)
- **Solution:** Create a test user manually in Supabase Dashboard → Table Editor → `users` table
- **Solution:** Ensure you're using a valid `user_id` (UUID) that exists in the `users` table
- **Solution:** Check if the user exists by querying the `users` table in Supabase

**Issue:** `Tweet not found` error
- **Solution:** Verify the tweet_id is correct by using `GET /api/v1/tweets/{tweet_id}`
- **Solution:** Ensure the tweet wasn't deleted

**Issue:** `Failed to create tweet`
- **Solution:** Check Supabase connection in `.env` file and verify schema is created
- **Solution:** Ensure text is between 1-280 characters

**Issue:** Media not appearing
- **Solution:** Verify the `tweet_id` in media matches an existing tweet
- **Solution:** Check media was actually saved: `GET /api/v1/media/tweet/{tweet_id}`

**Issue:** 500 error on any endpoint
- **Solution:** Check backend logs for detailed error messages
- **Solution:** Verify all Supabase environment variables are set correctly
- **Solution:** Restart the backend server