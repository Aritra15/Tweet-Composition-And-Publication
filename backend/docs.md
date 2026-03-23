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

**Description:** Generate an image using the Flux 2 Klein 4B model from OpenRouter. Optionally enhance the prompt before generation. The image is returned as base64 data for frontend storage and display.

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
  "image_data": "iVBORw0KGgoAAAANSUhEUgAA...",
  "image_url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "prompt": "your image generation prompt",
  "original_prompt": null
}
```

**Response (with enhancement):**
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
- `prompt`: The actual prompt used for generation (enhanced if requested)
- `original_prompt`: The original prompt before enhancement (only present when `enhance_prompt` is true)

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
- No backend storage required - handle storage on the frontend
- Timeout: 120 seconds
- The `prompt` field in the response contains the actual prompt used for generation (enhanced if `enhance_prompt` was true)
- The `original_prompt` field will only be present when `enhance_prompt` is true
- Recommended to use IndexedDB for storing images in the browser to avoid localStorage size limitations