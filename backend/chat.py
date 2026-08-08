import os
import json
import logging
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field
from google import genai
from google.genai import types
from sqlalchemy.orm import Session
from sqlalchemy import or_

import models

logger = logging.getLogger(__name__)
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

class ChatQueryPlan(BaseModel):
    is_out_of_scope: bool = Field(description="True if the user is asking to perform an action (e.g. send an email) or asking about data outside our system.")
    needs_query: bool = Field(description="True if we need to query the database to answer the question.")
    
    # Query parameters for ProcessedEmail logs (includes skipped items)
    log_status: Optional[str] = Field(description="Filter by log status: 'routed', 'skipped', or 'error'.")
    
    # Query parameters for Tasks (routed items)
    task_category: Optional[str] = Field(description="Filter by category, e.g., 'marketing', 'enterprise_rfp'.")
    task_assignee_id: Optional[str] = Field(description="Filter by assignee_id, e.g., 'u_aarti'.")
    task_priority: Optional[str] = Field(description="Filter by priority, e.g., 'high', 'medium', 'low'.")
    task_confidence_below: Optional[float] = Field(description="Filter tasks with confidence below this threshold.")
    
    # Text matching (simple substring match on title/description/reason)
    keyword_search: Optional[str] = Field(description="A keyword to search for in skip_reason, title, or description. e.g. 'GST refunds', 'proposal'.")

def handle_chat_request(candidate_id: str, query_text: str, db: Session) -> Dict[str, Any]:
    # 1. Ask Gemini to plan the query
    plan_prompt = f"""
    You are the query planner for a Sales Inbox Agent.
    The user asked: "{query_text}"
    
    Determine if this question requires querying our database of processed emails and tasks.
    If the user asks to DO something (e.g., "send an email"), set is_out_of_scope to true.
    If the user asks about something we don't track, set is_out_of_scope to true.
    """
    
    try:
        plan_response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=plan_prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=ChatQueryPlan,
                temperature=0.0
            )
        )
        plan = ChatQueryPlan.model_validate_json(plan_response.text)
    except Exception as e:
        error_msg = str(e)
        if "RESOURCE_EXHAUSTED" in error_msg or "429" in error_msg or "Quota" in error_msg:
            return {
                "answer": "I'm currently experiencing rate limits from the Gemini API (Quota Exceeded). Please wait about a minute before asking another question.",
                "supporting_data": {}
            }
        return {
            "answer": f"I encountered an error trying to understand your question: {error_msg}",
            "supporting_data": {}
        }
    
    if plan.is_out_of_scope:
        return {
            "answer": "I can only answer questions about the processed emails and tasks. I cannot take actions like sending emails or answering questions outside this scope.",
            "supporting_data": {}
        }
        
    supporting_data = {}
    
    # 2. Execute the query
    if plan.needs_query:
        # Build Task Query
        task_query = db.query(models.Task).filter(models.Task.candidate_id == candidate_id)
        if plan.task_category:
            task_query = task_query.filter(models.Task.category == plan.task_category)
        if plan.task_assignee_id:
            task_query = task_query.filter(models.Task.assignee_id == plan.task_assignee_id)
        if plan.task_priority:
            task_query = task_query.filter(models.Task.priority == plan.task_priority)
        if plan.task_confidence_below is not None:
            task_query = task_query.filter(models.Task.confidence < plan.task_confidence_below)
        if plan.keyword_search:
            task_query = task_query.filter(
                or_(
                    models.Task.title.contains(plan.keyword_search),
                    models.Task.description.contains(plan.keyword_search)
                )
            )
            
        all_tasks = task_query.all()
        
        # Build Logs Query
        logs_query = db.query(models.ProcessedEmail).filter(models.ProcessedEmail.candidate_id == candidate_id)
        if plan.log_status:
            logs_query = logs_query.filter(models.ProcessedEmail.status == plan.log_status)
        if plan.keyword_search:
            logs_query = logs_query.filter(models.ProcessedEmail.skip_reason.contains(plan.keyword_search))
            
        all_logs = logs_query.all()
        
        # Only return a subset of raw items to prevent context window bloat, 
        # but return precise aggregate numbers based on the filtered results.
        supporting_data["aggregates"] = {
            "filtered_tasks_count": len(all_tasks),
            "filtered_logs_count": len(all_logs),
            "total_deal_value_inr": sum(t.deal_value_inr for t in all_tasks if t.deal_value_inr)
        }
        
        supporting_data["tasks_sample"] = [
            {
                "task_id": t.task_id,
                "title": t.title,
                "assignee": t.assignee_id,
                "category": t.category,
                "deal_value_inr": t.deal_value_inr
            } for t in all_tasks[:5]
        ]
        
        supporting_data["logs_sample"] = [
            {
                "email_id": l.email_id,
                "status": l.status,
                "reason": l.skip_reason
            } for l in all_logs[:5]
        ]

    # 3. Generate answer
    answer_prompt = f"""
    You are an AI assistant helping a sales operations executive understand their inbox.
    You have queried the database and received the following structured data:
    {json.dumps(supporting_data, indent=2, default=str)}
    
    The user's original question was: "{query_text}"
    
    Provide a clear, natural language answer based ONLY on the structured data above.
    If the data shows zero matches for their query, state clearly that there are zero matches.
    If the data is insufficient to answer completely, explain what you can answer and what is missing.
    Do NOT invent or guess numbers, names, or dates.
    """
    
    try:
        answer_response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=answer_prompt,
            config=types.GenerateContentConfig(
                temperature=0.1
            )
        )
        
        return {
            "answer": answer_response.text,
            "supporting_data": supporting_data
        }
    except Exception as e:
        error_msg = str(e)
        if "RESOURCE_EXHAUSTED" in error_msg or "429" in error_msg or "Quota" in error_msg:
            return {
                "answer": "I'm currently experiencing rate limits from the Gemini API (Quota Exceeded). Please wait about a minute before asking another question.",
                "supporting_data": supporting_data
            }
        return {
            "answer": f"I encountered an error trying to generate the answer: {error_msg}",
            "supporting_data": supporting_data
        }
