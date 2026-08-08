from pydantic import BaseModel, Field, EmailStr
from typing import Optional, Literal, List
from datetime import datetime

class TaskCreate(BaseModel):
    candidate_id: str
    source_email_id: str
    thread_id: str
    title: str
    description: Optional[str] = None
    assignee_id: str
    category: Literal["enterprise_rfp", "smb_enquiry", "marketing", "alliances", "finance", "triage"]
    priority: Literal["high", "medium", "low"]
    due_date: Optional[str] = None
    deal_value_inr: Optional[int] = None
    company_name: Optional[str] = None
    confidence: float = Field(ge=0.0, le=1.0)

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assignee_id: Optional[str] = None
    category: Optional[Literal["enterprise_rfp", "smb_enquiry", "marketing", "alliances", "finance", "triage"]] = None
    priority: Optional[Literal["high", "medium", "low"]] = None
    due_date: Optional[str] = None
    deal_value_inr: Optional[int] = None
    company_name: Optional[str] = None
    confidence: Optional[float] = Field(None, ge=0.0, le=1.0)

class TaskResponse(BaseModel):
    task_id: str
    candidate_id: str
    source_email_id: str
    created_at: str

class ErrorResponse(BaseModel):
    error: str
    field: str
    received: str
    allowed: List[str]

from typing import Any, Dict

class IngestRequest(BaseModel):
    candidate_id: str
    emails: List[Dict[str, Any]]

class IngestResponse(BaseModel):
    processed: int
    tasks_created: int
    tasks_updated: int
    skipped: int
    errors: List[str]

class ChatRequest(BaseModel):
    candidate_id: str
    query: str


