from fastapi import APIRouter, status

from app.schemas.tweet import (
    PollAttachCreate,
    PollOptionAttachCreate,
    PollVoteCreate,
    PollOptionResponse,
    PollResponse,
)
from app.services.poll_service import poll_service


router = APIRouter()


@router.post("", response_model=PollResponse, status_code=status.HTTP_201_CREATED)
async def create_poll(payload: PollAttachCreate) -> PollResponse:
    """
    Create a poll for an existing tweet.

    - **tweet_id**: UUID of the tweet
    - **question**: Poll question
    """
    return await poll_service.create_poll(payload)


@router.post("/{poll_id}/options", response_model=PollOptionResponse, status_code=status.HTTP_201_CREATED)
async def create_poll_option(poll_id: str, payload: PollOptionAttachCreate) -> PollOptionResponse:
    """
    Add one option to an existing poll.

    - **poll_id**: UUID of the poll
    - **text**: Option text
    """
    return await poll_service.add_poll_option(poll_id, payload)


@router.post("/{poll_id}/votes", response_model=PollResponse)
async def vote_poll(poll_id: str, payload: PollVoteCreate) -> PollResponse:
    """
    Cast or update a user's vote for a poll.

    - **poll_id**: UUID of the poll
    - **user_id**: UUID of the voting user
    - **option_id**: UUID of the selected option
    """
    return await poll_service.vote_poll(poll_id, payload)
