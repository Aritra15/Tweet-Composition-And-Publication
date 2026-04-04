from fastapi import HTTPException

from app.db.supabase import get_supabase_client
from app.schemas.support import (
    SupportTicketCreate,
    SupportTicketMessageCreate,
    SupportTicketMessageResponse,
    SupportTicketResponse,
)


class SupportService:
    def __init__(self):
        self.supabase = get_supabase_client()

    async def create_ticket(self, payload: SupportTicketCreate) -> SupportTicketResponse:
        result = self.supabase.table("support_tickets").insert({
            "user_id": payload.user_id,
            "category": payload.category,
            "subject": payload.subject,
            "description": payload.description,
            "priority": payload.priority,
        }).execute()

        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create support ticket")

        return SupportTicketResponse(**result.data[0])

    async def get_user_tickets(self, user_id: str) -> list[SupportTicketResponse]:
        result = self.supabase.table("support_tickets")\
            .select("*")\
            .eq("user_id", user_id)\
            .order("created_at", desc=True)\
            .execute()

        return [SupportTicketResponse(**row) for row in (result.data or [])]

    async def add_message(self, ticket_id: str, payload: SupportTicketMessageCreate) -> SupportTicketMessageResponse:
        result = self.supabase.table("support_ticket_messages").insert({
            "ticket_id": ticket_id,
            "sender_user_id": payload.sender_user_id,
            "sender_role": payload.sender_role,
            "message": payload.message.strip(),
        }).execute()

        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create support message")

        message = result.data[0]

        sender_name = None
        sender_handle = None
        if message.get("sender_user_id"):
            user_result = self.supabase.table("users")\
                .select("username, user_handle")\
                .eq("id", message["sender_user_id"])\
                .limit(1)\
                .execute()
            sender = (user_result.data or [{}])[0]
            sender_name = sender.get("username")
            sender_handle = sender.get("user_handle")

        return SupportTicketMessageResponse(
            id=message["id"],
            ticket_id=message["ticket_id"],
            sender_user_id=message.get("sender_user_id"),
            sender_role=message["sender_role"],
            sender_name=sender_name,
            sender_handle=sender_handle,
            message=message["message"],
            created_at=message["created_at"],
        )

    async def get_ticket_messages(self, ticket_id: str) -> list[SupportTicketMessageResponse]:
        messages_result = self.supabase.table("support_ticket_messages")\
            .select("*")\
            .eq("ticket_id", ticket_id)\
            .order("created_at", desc=False)\
            .execute()

        messages = messages_result.data or []
        sender_ids = list({msg["sender_user_id"] for msg in messages if msg.get("sender_user_id")})

        senders_by_id = {}
        if sender_ids:
            users_result = self.supabase.table("users")\
                .select("id, username, user_handle")\
                .in_("id", sender_ids)\
                .execute()
            senders_by_id = {row["id"]: row for row in (users_result.data or [])}

        return [
            SupportTicketMessageResponse(
                id=msg["id"],
                ticket_id=msg["ticket_id"],
                sender_user_id=msg.get("sender_user_id"),
                sender_role=msg["sender_role"],
                sender_name=senders_by_id.get(msg.get("sender_user_id"), {}).get("username") if msg.get("sender_user_id") else None,
                sender_handle=senders_by_id.get(msg.get("sender_user_id"), {}).get("user_handle") if msg.get("sender_user_id") else None,
                message=msg["message"],
                created_at=msg["created_at"],
            )
            for msg in messages
        ]


support_service = SupportService()
