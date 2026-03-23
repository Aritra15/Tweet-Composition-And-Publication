from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.ai_service import ai_service


router = APIRouter()


class TextEnhanceRequest(BaseModel):
    text: str


class ImagePromptEnhanceRequest(BaseModel):
    prompt: str


class EnhanceResponse(BaseModel):
    enhanced: str


class ImageGenerateRequest(BaseModel):
    prompt: str
    enhance_prompt: bool = False


class ImageGenerateResponse(BaseModel):
    filename: str
    image_data: str
    image_url: str
    prompt: str
    original_prompt: str | None = None


@router.post("/enhance-text", response_model=EnhanceResponse)
async def enhance_text(request: TextEnhanceRequest) -> EnhanceResponse:
    try:
        enhanced_text = await ai_service.enhance_text(request.text)
        return EnhanceResponse(enhanced=enhanced_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error enhancing text: {str(e)}")


@router.post("/enhance-image-prompt", response_model=EnhanceResponse)
async def enhance_image_prompt(request: ImagePromptEnhanceRequest) -> EnhanceResponse:
    try:
        enhanced_prompt = await ai_service.enhance_image_prompt(request.prompt)
        return EnhanceResponse(enhanced=enhanced_prompt)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error enhancing image prompt: {str(e)}")


@router.post("/generate-image", response_model=ImageGenerateResponse)
async def generate_image(request: ImageGenerateRequest) -> ImageGenerateResponse:
    try:
        prompt_to_use = request.prompt
        original_prompt = None

        if request.enhance_prompt:
            original_prompt = request.prompt
            prompt_to_use = await ai_service.enhance_image_prompt(request.prompt)

        result = await ai_service.generate_image(prompt_to_use)

        if original_prompt:
            result["original_prompt"] = original_prompt

        return ImageGenerateResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating image: {str(e)}")


@router.get("/health-gemma")
async def health_gemma() -> dict[str, str]:
    return await ai_service.health_check()
