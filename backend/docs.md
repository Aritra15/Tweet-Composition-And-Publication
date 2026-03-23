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

### 3. Enhance Image Prompt

**Endpoint:** `POST /enhance-image-prompt`

**URL:** `http://localhost:8000/api/v1/ai/enhance-image-prompt`

**Description:** Enhance image generation prompts by adding details about composition, lighting, style, and quality markers.

**Request Body:**
```json
{
  "prompt": "your basic image prompt"
}
```

**Response:**
```json
{
  "enhanced": "Your detailed enhanced prompt with composition, lighting, and style details"
}
```

**Example:**
```bash
curl -X POST "http://localhost:8000/api/v1/ai/enhance-image-prompt" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "a cat sitting on a chair"}'
```

---

### 4. Generate Image

**Endpoint:** `POST /generate-image`

**URL:** `http://localhost:8000/api/v1/ai/generate-image`

**Description:** Generate an image using the Flux 2 Klein 4B model from OpenRouter. Optionally enhance the prompt before generation.

**Request Body:**
```json
{
  "prompt": "your image generation prompt",
  "enhance_prompt": false
}
```

**Parameters:**
- `prompt` (string, required): The image generation prompt
- `enhance_prompt` (boolean, optional, default: false): If true, the prompt will be enhanced before image generation

**Response (without enhancement):**
```json
{
  "filename": "generated_20260323_123456_789012.png",
  "file_path": "/path/to/backend/ai-images-storage/generated_20260323_123456_789012.png",
  "prompt": "your image generation prompt",
  "original_prompt": null
}
```

**Response (with enhancement):**
```json
{
  "filename": "generated_20260323_123456_789012.png",
  "file_path": "/path/to/backend/ai-images-storage/generated_20260323_123456_789012.png",
  "prompt": "Enhanced detailed prompt used for generation",
  "original_prompt": "your original simple prompt"
}
```

**Example (without enhancement):**
```bash
curl -X POST "http://localhost:8000/api/v1/ai/generate-image" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "a beautiful sunset over mountains"}'
```

**Example (with enhancement):**
```bash
curl -X POST "http://localhost:8000/api/v1/ai/generate-image" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "a cat", "enhance_prompt": true}'
```

**Notes:**
- Generated images are saved in `backend/ai-images-storage/` directory
- Image format: PNG
- Timeout: 120 seconds
- The `prompt` field in the response contains the actual prompt used for generation (enhanced if `enhance_prompt` was true)
- The `original_prompt` field will only be present when `enhance_prompt` is true