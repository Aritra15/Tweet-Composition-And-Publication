from fastapi import APIRouter

from app.api.v1.endpoints import ai, health, tweets, media


api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(tweets.router, prefix="/tweets", tags=["tweets"])
api_router.include_router(media.router, prefix="/media", tags=["media"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])
