from fastapi import APIRouter

from app.schemas.support import (
    SupportTicketCreate,
    SupportTicketMessageCreate,
    SupportTicketMessageResponse,
    SupportTicketResponse,
)
from app.services.support_service import support_service

router = APIRouter()


@router.post("/tickets", response_model=SupportTicketResponse)
async def create_support_ticket(payload: SupportTicketCreate) -> SupportTicketResponse:
    return await support_service.create_ticket(payload)


@router.get("/tickets/user/{user_id}", response_model=list[SupportTicketResponse])
async def get_user_support_tickets(user_id: str) -> list[SupportTicketResponse]:
    return await support_service.get_user_tickets(user_id)


@router.get("/tickets/{ticket_id}/messages", response_model=list[SupportTicketMessageResponse])
async def get_support_ticket_messages(ticket_id: str) -> list[SupportTicketMessageResponse]:
    return await support_service.get_ticket_messages(ticket_id)


@router.post("/tickets/{ticket_id}/messages", response_model=SupportTicketMessageResponse)
async def add_support_ticket_message(ticket_id: str, payload: SupportTicketMessageCreate) -> SupportTicketMessageResponse:
    return await support_service.add_message(ticket_id, payload)
