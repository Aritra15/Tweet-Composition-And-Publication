import base64
import httpx
import re
from datetime import datetime
from app.core.config import settings


class OpenRouterService:
    BASE_URL = "https://openrouter.ai/api/v1/chat/completions"
    POLLINATIONS_IMAGE_URL = "https://gen.pollinations.ai/v1/images/generations"

    PROMPTS = {
        "text_enhancement": """You are an expert writing assistant. Your task is to enhance the provided text by:
- Correcting grammatical errors
- Improving sentence structure and flow
- Ensuring proper punctuation and capitalization
- Making the text more clear and concise
- Keeping the original meaning and tone intact

Return ONLY the enhanced text without any explanations, comments, or additional formatting.""",

        "image_prompt_enhancement": """You are an expert AI image generation prompt engineer. Your task is to enhance image generation prompts by:
- Clarifying ambiguous descriptions
- Maintaining the core concept while making it more specific
- Still keeping the prompt concise and focused on the main subject
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
        if not settings.pollinations_api_key:
            raise ValueError("Pollinations API key not configured")

        headers = {
            "Authorization": f"Bearer {settings.pollinations_api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "prompt": prompt,
            "model": settings.pollinations_image_model,
            "n": 1,
            "size": settings.pollinations_image_size,
            "quality": settings.pollinations_image_quality,
            "response_format": "b64_json",
            "user": "tweet-composition-api",
            "image": ""
        }

        endpoint = settings.pollinations_image_endpoint or self.POLLINATIONS_IMAGE_URL

        async with httpx.AsyncClient(timeout=settings.pollinations_image_timeout_seconds) as client:
            response = await client.post(endpoint, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()

            items = data.get("data")
            if not items or not isinstance(items, list):
                raise ValueError("No image generated in response")

            first = items[0]
            if not isinstance(first, dict):
                raise ValueError("Invalid image response format")

            revised_prompt = first.get("revised_prompt") or prompt
            b64_data = first.get("b64_json")
            image_url = first.get("url")

            mime_type = "image/png"

            if isinstance(b64_data, str) and b64_data.strip():
                raw_data = b64_data.strip()
                if raw_data.startswith("data:"):
                    prefix, raw_data = raw_data.split(",", 1)
                    mime_type = prefix.split(";")[0].split(":", 1)[1]
                image_data = raw_data
            elif isinstance(image_url, str) and image_url.strip():
                image_response = await client.get(image_url.strip())
                image_response.raise_for_status()
                content_type = image_response.headers.get("content-type", "image/png")
                mime_type = content_type.split(";")[0].strip() or "image/png"
                image_data = base64.b64encode(image_response.content).decode("ascii")
            else:
                raise ValueError("No image content found in provider response")

            # Generate unique filename with timestamp for reference
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")

            ext_map = {
                "image/jpeg": "jpg",
                "image/jpg": "jpg",
                "image/png": "png",
                "image/webp": "webp",
                "image/gif": "gif"
            }
            ext = ext_map.get(mime_type.lower(), "png")

            filename = f"generated_{timestamp}.{ext}"

            return {
                "filename": filename,
                "image_data": image_data,
                "image_url": f"data:{mime_type};base64,{image_data}",
                "prompt": revised_prompt
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
