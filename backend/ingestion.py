import os
import json
import logging
import asyncio
from typing import Optional, Literal
from pydantic import BaseModel, Field
from google import genai
from google.genai import types
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type

logger = logging.getLogger(__name__)

# Note: In production, ensure GEMINI_API_KEY is set in the environment.
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

class EmailClassification(BaseModel):
    action: Literal["route", "skip"] = Field(description="Whether to route this to a human or skip it (e.g., for spam, newsletters, out of office).")
    skip_reason: Optional[str] = Field(description="If action is 'skip', provide a short reason why.")
    assignee_id: Optional[Literal["u_aarti", "u_rohit", "u_meera", "u_karan", "u_divya", "u_triage"]] = Field(description="The user ID of the assignee if routed.")
    category: Optional[Literal["enterprise_rfp", "smb_enquiry", "marketing", "alliances", "finance", "triage"]] = Field(description="The category of the email.")
    priority: Optional[Literal["high", "medium", "low"]] = Field(description="The priority of the task. 'high' if there is a stated deadline within 72 hours.")
    due_date: Optional[str] = Field(description="The due date (YYYY-MM-DD) if stated. Null if not stated.")
    deal_value_inr: Optional[int] = Field(description="The deal value in rupees, no decimals. Null if not stated or inferable.")
    company_name: Optional[str] = Field(description="The company name if determinable. Null if not.")
    confidence: float = Field(description="0.0-1.0. Your own certainty in this routing decision.")
    title: Optional[str] = Field(description="A short, descriptive title for the task (required if routing).")
    description: Optional[str] = Field(description="A detailed description of the task based on the email body (required if routing).")

@retry(
    wait=wait_exponential(multiplier=1, min=2, max=30),
    stop=stop_after_attempt(5),
    retry=retry_if_exception_type(Exception) # Catch API errors, specifically 429
)
async def classify_email_async(email_data: dict, sem: asyncio.Semaphore) -> EmailClassification:
    async with sem:
        prompt = f"""
        You are an intelligent email router for a B2B services company.
        Your job is to read an inbound email and determine who it should be assigned to, or if it should be skipped.

        ROUTING RULES:
        u_aarti (Aarti Menon): RFPs, RFIs, tenders, and inbound deals above ₹10,00,000. Government and PSU tenders always go to Aarti, irrespective of deal value.
        u_rohit (Rohit Sharma): Product enquiries, demo requests, deals at or below ₹10,00,000.
        u_meera (Meera Iyer): Webinars, event and conference sponsorships, content collaborations, PR and media.
        u_karan (Karan Doshi): Reseller, channel partner, and technology integration proposals.
        u_divya (Divya Rao): Invoices, purchase orders, payment reminders, GST and vendor billing.
        u_triage (Triage Queue): Anything ambiguous or that doesn't cleanly fit above. (e.g., two distinct asks owned by two different people).
        
        ADDITIONAL RULES:
        1. Any email with a stated deadline within 72 hours of `received_at` is priority "high", regardless of owner.
        2. Do not create tasks for out-of-office auto-replies, newsletters, or unsolicited vendor spam.
        
        Email Data:
        {json.dumps(email_data, indent=2)}
        """
        
        # We use run_in_executor here if client.aio is not fully supported or throws loop errors, 
        # but the latest google-genai supports asyncio directly via client.aio
        response = await client.aio.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=EmailClassification,
                temperature=0.1
            )
        )
        
        return EmailClassification.model_validate_json(response.text)
