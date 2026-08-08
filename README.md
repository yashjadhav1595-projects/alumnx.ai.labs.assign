# Sales Inbox → Task Router

**An AI operations control plane that turns unstructured business email into reliable, explainable, and actionable work.**

This project is an automated sales inbox router designed for a B2B services company. It ingests a stream of emails, uses Large Language Models (LLMs) to extract structured semantic facts, and then applies deterministic Python business rules to assign priorities, categories, and owners. 

### Live Demos
- **Frontend**: https://alumnx-ai-labs-assign1.vercel.app/
- **Backend API**: https://alumnx-ai-labs-assign.onrender.com

---

## Technical Pillars (FDE Architecture)

1. **Semantic Extraction + Deterministic Rules**
   - The LLM is used strictly for extraction (understanding intent, budgets, deadlines).
   - Python code is used for the final business decision (Rule 3 beats Rule 1). This ensures that routing logic is auditable, testable, and modifiable without re-prompting the model.

2. **Explainable Routing**
   - Every routed email stores a `skip_reason`, a `confidence` score, and the exact extracted intent. The UI exposes this evidence, making the AI's "thought process" visible to human operators.

3. **Grounded Conversational Chat**
   - The Chat UI does **not** dump the database into the LLM context.
   - User questions are compiled into a structured SQL query plan (`ChatQueryPlan`). The backend executes the query against SQLite, and passes the **aggregated integers** back to the LLM to format the response. This eliminates hallucination.

4. **Thread Reconciliation**
   - Real-world email involves replies and forwards.
   - The system tracks `thread_id`. If a reply changes the budget (e.g. ₹25L → ₹32L), the system patches the existing task and logs a `TaskEvent` instead of duplicating work.

5. **AI Honesty & Fallbacks**
   - If an email contains conflicting intent (e.g., both "evaluate platform" and "sponsor webinar"), the model scores low confidence and the system kicks it to the `u_triage` queue.
   - If the LLM throws a 429 Quota Exceeded error, a DLQ (Dead Letter Queue) mechanism prevents the email from being dropped, ensuring 100% data durability.

6. **Idempotency**
   - If the same JSON payload is submitted twice, the ingestion pipeline checks `email_id` against the `ProcessedEmail` logs and skips it instantly.

---

## System Architecture

```text
                    PUBLIC HTTPS
                         │
              ┌──────────▼──────────┐
              │      FRONTEND       │
              │      React/Vite     │
              └──────────┬──────────┘
                         │
                         │ HTTPS
                         ▼
              ┌─────────────────────┐
              │       BACKEND       │
              │       FastAPI       │
              └─────────┬───────────┘
                        │
             ┌──────────┼───────────┐
             ▼          ▼           ▼
          SQLite      Gemini      Task API
```

## Running Locally

### Backend Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

export GEMINI_API_KEY="your-api-key"
uvicorn main:app --reload --port 8000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
# alumnx.ai.labs.assign
