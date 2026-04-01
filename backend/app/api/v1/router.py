from fastapi import APIRouter

from app.api.v1.endpoints import ai, auth, health, tweets, media, polls


api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(tweets.router, prefix="/tweets", tags=["tweets"])
api_router.include_router(media.router, prefix="/media", tags=["media"])
api_router.include_router(polls.router, prefix="/polls", tags=["polls"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])
