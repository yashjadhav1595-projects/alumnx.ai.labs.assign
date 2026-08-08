import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Depends, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import asyncio
import traceback
import models, schemas, ingestion, chat
from database import engine, get_db
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import Optional
from fastapi.middleware.cors import CORSMiddleware
import json

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Task Router API")

cors_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_ASSIGNEES = ["u_aarti", "u_rohit", "u_meera", "u_karan", "u_divya", "u_triage"]

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    for error in exc.errors():
        if error["loc"][-1] == "assignee_id":
            try:
                body = await request.json()
                received = body.get("assignee_id", "")
            except:
                received = ""
                
            return JSONResponse(
                status_code=400,
                content={
                    "error": "invalid_enum_value",
                    "field": "assignee_id",
                    "received": received,
                    "allowed": ALLOWED_ASSIGNEES
                },
            )
    return JSONResponse(status_code=422, content={"detail": exc.errors()})

@app.post("/tasks", response_model=schemas.TaskResponse, status_code=201)
def create_task(task: schemas.TaskCreate, db: Session = Depends(get_db)):
    if task.assignee_id not in ALLOWED_ASSIGNEES:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "invalid_enum_value",
                "field": "assignee_id",
                "received": task.assignee_id,
                "allowed": ALLOWED_ASSIGNEES
            }
        )
    
    db_task = models.Task(**task.model_dump())
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

@app.patch("/tasks/{task_id}")
def update_task(task_id: str, task: schemas.TaskUpdate, db: Session = Depends(get_db)):
    db_task = db.query(models.Task).filter(models.Task.task_id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    if task.assignee_id is not None and task.assignee_id not in ALLOWED_ASSIGNEES:
        return JSONResponse(
            status_code=400,
            content={
                "error": "invalid_enum_value",
                "field": "assignee_id",
                "received": task.assignee_id,
                "allowed": ALLOWED_ASSIGNEES
            },
        )
        
    update_data = task.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_task, key, value)
        
    db.commit()
    db.refresh(db_task)
    
    # Return the full updated task per spec
    return db_task

@app.get("/tasks")
def list_tasks(
    candidate_id: str,
    thread_id: Optional[str] = None,
    source_email_id: Optional[str] = None,
    assignee_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Task).filter(models.Task.candidate_id == candidate_id)
    if thread_id:
        query = query.filter(models.Task.thread_id == thread_id)
    if source_email_id:
        query = query.filter(models.Task.source_email_id == source_email_id)
    if assignee_id:
        query = query.filter(models.Task.assignee_id == assignee_id)
        
    return query.all()

@app.delete("/tasks/{task_id}")
def delete_task(task_id: str, db: Session = Depends(get_db)):
    db_task = db.query(models.Task).filter(models.Task.task_id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(db_task)
    db.commit()
    return {"status": "success"}

@app.get("/users")
def get_users():
    return {
        "team": [
            { "user_id": "u_aarti", "name": "Aarti Menon", "department": "Sales — Enterprise", "scope": "RFPs, RFIs, tenders, and inbound deals above ₹10,00,000" },
            { "user_id": "u_rohit", "name": "Rohit Sharma", "department": "Sales — SMB", "scope": "Product enquiries, demo requests, deals at or below ₹10,00,000" },
            { "user_id": "u_meera", "name": "Meera Iyer", "department": "Marketing", "scope": "Webinars, event and conference sponsorships, content collaborations, PR and media" },
            { "user_id": "u_karan", "name": "Karan Doshi", "department": "Alliances", "scope": "Reseller, channel partner, and technology integration proposals" },
            { "user_id": "u_divya", "name": "Divya Rao", "department": "Finance", "scope": "Invoices, purchase orders, payment reminders, GST and vendor billing" },
            { "user_id": "u_triage", "name": "Triage Queue", "department": "Operations", "scope": "Ambiguous items requiring human review" }
        ]
    }

@app.post("/ingest", response_model=schemas.IngestResponse)
async def ingest_emails(request: schemas.IngestRequest, db: Session = Depends(get_db)):
    candidate_id = request.candidate_id.lower().strip()
    
    processed = 0
    tasks_created = 0
    tasks_updated = 0
    skipped = 0
    errors = []
    
    # 1. Filter out already processed emails (Idempotency)
    pending_emails = []
    for email in request.emails:
        email_id = email.get("email_id")
        existing_log = db.query(models.ProcessedEmail).filter(
            models.ProcessedEmail.email_id == email_id,
            models.ProcessedEmail.candidate_id == candidate_id
        ).first()
        existing_fail = db.query(models.FailedEmail).filter(
            models.FailedEmail.email_id == email_id,
            models.FailedEmail.candidate_id == candidate_id
        ).first()
        
        if existing_log or existing_fail:
            continue
        pending_emails.append(email)
        
    if not pending_emails:
        return schemas.IngestResponse(processed=0, tasks_created=0, tasks_updated=0, skipped=0, errors=[])

    # 2. Async Classification Phase (Fast Concurrent Processing)
    sem = asyncio.Semaphore(15) # Limit concurrency to avoid massive spikes
    tasks = [ingestion.classify_email_async(email, sem) for email in pending_emails]
    
    # Run all classifications concurrently
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # 3. Synchronous Database Write Phase (Safe, no SQLite locking)
    for email, classification in zip(pending_emails, results):
        email_id = email.get("email_id")
        thread_id = email.get("thread_id")
        processed += 1
        
        # Handle DLQ (Dead Letter Queue)
        if isinstance(classification, Exception):
            err_str = str(classification)
            errors.append(f"Error processing {email_id}: {err_str}")
            
            # Log to DLQ
            fail_log = models.FailedEmail(
                candidate_id=candidate_id,
                email_id=email_id,
                error_trace=traceback.format_exc() if hasattr(classification, '__traceback__') else err_str
            )
            db.add(fail_log)
            
            # Create a fallback task so we have ZERO dropped emails
            fallback_task = models.Task(
                candidate_id=candidate_id,
                source_email_id=email_id,
                thread_id=thread_id,
                title="[DLQ FALLBACK] Email Processing Failed",
                description=f"System failed to classify this email due to: {err_str}. Manual review required.",
                assignee_id="u_triage",
                category="triage",
                priority="high",
                confidence=0.0
            )
            db.add(fallback_task)
            tasks_created += 1
            continue

        # Normal Processing Logging
        log_entry = models.ProcessedEmail(
            candidate_id=candidate_id,
            email_id=email_id,
            thread_id=thread_id,
            status="skipped" if classification.action == "skip" else "routed",
            category=classification.category,
            skip_reason=classification.skip_reason,
            confidence=classification.confidence
        )
        db.add(log_entry)
        
        if classification.action == "skip":
            skipped += 1
        else:
            # Thread reconciliation with Event Sourcing
            existing_task = db.query(models.Task).filter(
                models.Task.thread_id == thread_id,
                models.Task.candidate_id == candidate_id
            ).first()
            
            if existing_task:
                # Capture previous state
                prev_state = {
                    "priority": existing_task.priority,
                    "due_date": existing_task.due_date,
                    "deal_value_inr": existing_task.deal_value_inr
                }
                
                # Update task
                existing_task.previous_state = prev_state
                existing_task.is_updated = True
                if classification.priority == "high":
                    existing_task.priority = "high"
                if classification.due_date:
                    existing_task.due_date = classification.due_date
                if classification.deal_value_inr:
                    existing_task.deal_value_inr = classification.deal_value_inr
                
                # Log Event
                event = models.TaskEvent(
                    task_id=existing_task.task_id,
                    event_type="UPDATED",
                    previous_state=prev_state,
                    new_state={
                        "priority": existing_task.priority,
                        "due_date": existing_task.due_date,
                        "deal_value_inr": existing_task.deal_value_inr
                    }
                )
                db.add(event)
                tasks_updated += 1
            else:
                # Create Task
                new_task = models.Task(
                    candidate_id=candidate_id,
                    source_email_id=email_id,
                    thread_id=thread_id,
                    title=classification.title or "Untitled Task",
                    description=classification.description,
                    assignee_id=classification.assignee_id,
                    category=classification.category,
                    priority=classification.priority or "low",
                    due_date=classification.due_date,
                    deal_value_inr=classification.deal_value_inr,
                    company_name=classification.company_name,
                    confidence=classification.confidence or 1.0
                )
                db.add(new_task)
                db.flush() # To get the task_id
                
                # Log Event
                event = models.TaskEvent(
                    task_id=new_task.task_id,
                    event_type="CREATED",
                    new_state={"assignee_id": new_task.assignee_id, "priority": new_task.priority}
                )
                db.add(event)
                tasks_created += 1
                
    db.commit()

    return schemas.IngestResponse(
        processed=processed,
        tasks_created=tasks_created,
        tasks_updated=tasks_updated,
        skipped=skipped,
        errors=errors
    )

@app.get("/api/tasks")
def get_api_tasks(candidate_id: str, db: Session = Depends(get_db)):
    tasks = db.query(models.Task).filter(models.Task.candidate_id == candidate_id).all()
    logs = db.query(models.ProcessedEmail).filter(models.ProcessedEmail.candidate_id == candidate_id).all()
    
    return {
        "tasks": tasks,
        "logs": logs
    }

@app.get("/api/stats")
def get_api_stats(candidate_id: str, db: Session = Depends(get_db)):
    processed = db.query(func.count(models.ProcessedEmail.id)).filter(models.ProcessedEmail.candidate_id == candidate_id).scalar()
    created = db.query(func.count(models.Task.task_id)).filter(models.Task.candidate_id == candidate_id).scalar()
    skipped = db.query(func.count(models.ProcessedEmail.id)).filter(
        models.ProcessedEmail.candidate_id == candidate_id,
        models.ProcessedEmail.status == "skipped"
    ).scalar()
    
    return {
        "processed": processed,
        "tasks_created": created,
        "skipped": skipped
    }

@app.post("/api/chat")
def api_chat(request: schemas.ChatRequest, db: Session = Depends(get_db)):
    result = chat.handle_chat_request(request.candidate_id, request.query, db)
    return result
