import httpx
import re
from datetime import datetime
from app.core.config import settings


class OpenRouterService:
    BASE_URL = "https://openrouter.ai/api/v1/chat/completions"

    PROMPTS = {
        "text_enhancement": """You are an expert writing assistant. Your task is to enhance the provided text by:
- Correcting grammatical errors
- Improving sentence structure and flow
- Ensuring proper punctuation and capitalization
- Making the text more clear and concise
- Keeping the original meaning and tone intact

Return ONLY the enhanced text without any explanations, comments, or additional formatting.""",

        "image_prompt_enhancement": """You are an expert AI image generation prompt engineer. Your task is to enhance image generation prompts by:
- Adding relevant details about composition, lighting, and style
- Clarifying ambiguous descriptions
- Maintaining the core concept while making it more specific

    Return ONLY the enhanced prompt without any explanations or comments.""",

        "hashtag_suggestion": """You are a social media assistant.
    Given tweet text, suggest up to 7 relevant hashtags.

    Rules:
    - Return hashtags only.
    - Each hashtag must start with #.
    - Keep hashtags concise and topical.
    - Do not include duplicates.
    - Do not include explanation or numbering.
    - Return plain text as a comma-separated list, e.g. #AI, #TechNews, #Startups"""
    }

    async def _call_api(self, system_prompt: str, user_message: str) -> str:
        if not settings.openrouter_api_key:
            raise ValueError("OpenRouter API key not configured")

        headers = {
            "Authorization": f"Bearer {settings.openrouter_api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": settings.app_url,
            "X-OpenRouter-Title": "Tweet Composition API"
        }

        payload = {
            "model": settings.openrouter_model,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": f"{system_prompt}\n\n{user_message}"
                        }
                    ]
                }
            ]
        }

        async with httpx.AsyncClient(timeout=45.0) as client:
            response = await client.post(self.BASE_URL, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"].strip()

    async def enhance_text(self, text: str) -> str:
        return await self._call_api(
            self.PROMPTS["text_enhancement"],
            text
        )

    async def enhance_image_prompt(self, prompt: str) -> str:
        return await self._call_api(
            self.PROMPTS["image_prompt_enhancement"],
            prompt
        )

    async def generate_image(self, prompt: str) -> dict[str, str]:
        if not settings.openrouter_api_key:
            raise ValueError("OpenRouter API key not configured")

        headers = {
            "Authorization": f"Bearer {settings.openrouter_api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": settings.app_url,
            "X-OpenRouter-Title": "Tweet Composition API"
        }

        payload = {
            "model": settings.openrouter_image_model,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "modalities": ["image"]
        }

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(self.BASE_URL, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()

            if not data.get("choices"):
                raise ValueError("No image generated in response")

            message = data["choices"][0]["message"]
            if not message.get("images"):
                raise ValueError("No images found in response")

            # Get the first generated image
            image_data = message["images"][0]["image_url"]["url"]

            # Parse base64 data URL (format: data:image/png;base64,...)
            base64_prefix = ""
            if image_data.startswith("data:"):
                parts = image_data.split(",", 1)
                base64_prefix = parts[0]  # e.g., "data:image/png;base64"
                image_data = parts[1]

            # Generate unique filename with timestamp for reference
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
            
            if base64_prefix:
                # Example: data:image/png;base64
                mime_type = base64_prefix.split(";")[0].split(":")[1]  # "image/png"
                ext = mime_type.split("/")[-1]  # "png" or "jpeg"
            else:
                ext = "png"  # fallback

            filename = f"generated_{timestamp}.{ext}"

            return {
                "filename": filename,
                "image_data": image_data,
                "image_url": f"{base64_prefix},{image_data}" if base64_prefix else f"data:image/png;base64,{image_data}",
                "prompt": prompt
            }

    async def suggest_hashtags(self, text: str) -> list[str]:
        if not text.strip():
            return []

        raw = await self._call_api(
            self.PROMPTS["hashtag_suggestion"],
            text
        )

        tags = re.findall(r"#\w+", raw)

        # Fallback: if model forgot # prefixes, extract comma/newline-separated tokens.
        if not tags:
            fallback = re.split(r"[,\n]", raw)
            tags = [f"#{token.strip().lstrip('#').replace(' ', '')}" for token in fallback if token.strip()]

        cleaned: list[str] = []
        seen: set[str] = set()

        for tag in tags:
            normalized = f"#{tag[1:]}"
            key = normalized.lower()
            if key in seen:
                continue
            seen.add(key)
            cleaned.append(normalized)
            if len(cleaned) == 7:
                break

        return cleaned

    async def health_check(self) -> dict[str, str]:
        try:
            if not settings.openrouter_api_key:
                return {
                    "status": "error",
                    "message": "OpenRouter API key not configured"
                }

            test_response = await self._call_api(
                "You are a helpful assistant. Respond with only 'OK'.",
                "Respond with OK"
            )

            return {
                "status": "ok",
                "model": settings.openrouter_model,
                "test_response": test_response
            }
        except Exception as e:
            return {
                "status": "error",
                "message": str(e)
            }


ai_service = OpenRouterService()
