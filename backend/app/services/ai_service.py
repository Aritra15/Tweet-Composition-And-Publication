import httpx
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
- Specifying artistic techniques and mediums when appropriate
- Clarifying ambiguous descriptions
- Maintaining the core concept while making it more specific

Return ONLY the enhanced prompt without any explanations or comments."""
    }

    async def _call_api(self, system_prompt: str, user_message: str) -> str:
        if not settings.openrouter_api_key:
            raise ValueError("OpenRouter API key not configured")

        headers = {
            "Authorization": f"Bearer {settings.openrouter_api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:8000",
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
