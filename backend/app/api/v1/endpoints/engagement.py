from fastapi import APIRouter, Query

from app.schemas.engagement import CommentCreate, CommentResponse, LikeToggleRequest, TweetEngagementSummary
from app.services.engagement_service import engagement_service

router = APIRouter()


@router.get("/tweets/{tweet_id}/summary", response_model=TweetEngagementSummary)
async def get_tweet_engagement_summary(tweet_id: str, user_id: str | None = Query(default=None)) -> TweetEngagementSummary:
    return await engagement_service.get_summary(tweet_id, user_id)


@router.post("/tweets/{tweet_id}/likes", response_model=TweetEngagementSummary)
async def like_tweet(tweet_id: str, payload: LikeToggleRequest) -> TweetEngagementSummary:
    return await engagement_service.like_tweet(tweet_id, payload.user_id)


@router.delete("/tweets/{tweet_id}/likes", response_model=TweetEngagementSummary)
async def unlike_tweet(tweet_id: str, user_id: str = Query(...)) -> TweetEngagementSummary:
    return await engagement_service.unlike_tweet(tweet_id, user_id)


@router.get("/tweets/{tweet_id}/comments", response_model=list[CommentResponse])
async def get_tweet_comments(tweet_id: str) -> list[CommentResponse]:
    return await engagement_service.get_comments(tweet_id)


@router.post("/tweets/{tweet_id}/comments", response_model=CommentResponse)
async def add_tweet_comment(tweet_id: str, payload: CommentCreate) -> CommentResponse:
    return await engagement_service.add_comment(tweet_id, payload)
