from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean, JSON, ForeignKey
from datetime import datetime
from database import Base
import uuid

def generate_uuid():
    return f"tsk_{uuid.uuid4().hex[:8]}"

class Task(Base):
    __tablename__ = "tasks"
    
    task_id = Column(String, primary_key=True, default=generate_uuid)
    candidate_id = Column(String, index=True)
    source_email_id = Column(String, index=True)
    thread_id = Column(String, index=True)
    created_at = Column(String, default=lambda: datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S+05:30"))
    
    title = Column(String)
    description = Column(String, nullable=True)
    assignee_id = Column(String)
    category = Column(String)
    priority = Column(String)
    due_date = Column(String, nullable=True)
    deal_value_inr = Column(Integer, nullable=True)
    company_name = Column(String, nullable=True)
    confidence = Column(Float)
    is_updated = Column(Boolean, default=False)
    previous_state = Column(JSON, nullable=True)

class ProcessedEmail(Base):
    __tablename__ = "processed_emails"
    
    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(String, index=True)
    email_id = Column(String, unique=True, index=True)
    thread_id = Column(String, index=True)
    status = Column(String) # "routed", "skipped", "error"
    category = Column(String, nullable=True)
    skip_reason = Column(String, nullable=True)
    confidence = Column(Float, nullable=True)
    processed_at = Column(String, default=lambda: datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S+05:30"))

class TaskEvent(Base):
    __tablename__ = "task_events"
    
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(String, ForeignKey("tasks.task_id"), index=True)
    event_type = Column(String) # "CREATED", "UPDATED", "ESCALATED"
    previous_state = Column(JSON, nullable=True)
    new_state = Column(JSON, nullable=True)
    created_at = Column(String, default=lambda: datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S+05:30"))

class FailedEmail(Base):
    __tablename__ = "failed_emails"
    
    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(String, index=True)
    email_id = Column(String, unique=True, index=True)
    error_trace = Column(String)
    failed_at = Column(String, default=lambda: datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S+05:30"))
