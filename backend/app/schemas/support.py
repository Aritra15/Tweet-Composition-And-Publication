from datetime import datetime

from pydantic import BaseModel, Field


class SupportTicketCreate(BaseModel):
    user_id: str
    category: str = Field(..., min_length=1, max_length=40)
    subject: str = Field(..., min_length=1, max_length=140)
    description: str = Field(..., min_length=1, max_length=5000)
    priority: str = Field(default="normal", pattern="^(low|normal|high|urgent)$")


class SupportTicketResponse(BaseModel):
    id: str
    user_id: str
    category: str
    subject: str
    description: str
    status: str
    priority: str
    created_at: datetime
    updated_at: datetime


class SupportTicketMessageCreate(BaseModel):
    sender_user_id: str | None = None
    sender_role: str = Field(default="user", pattern="^(user|staff|system)$")
    message: str = Field(..., min_length=1, max_length=5000)


class SupportTicketMessageResponse(BaseModel):
    id: str
    ticket_id: str
    sender_user_id: str | None
    sender_role: str
    sender_name: str | None = None
    sender_handle: str | None = None
    message: str
    created_at: datetime
