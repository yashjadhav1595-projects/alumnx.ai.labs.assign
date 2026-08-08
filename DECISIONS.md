# DECISIONS.md

This document outlines the major engineering tradeoffs and decisions made during the architecture of the AlumnX Sales Inbox Task Router.

### 1. LLM Extraction vs. Deterministic Routing
**Decision:** Do not let the LLM make the final routing decision.
**Tradeoff:** Rather than asking Gemini "Who should this go to?", we ask Gemini "What are the core facts of this email (budget, intent, deadline)?". We then use Python code to evaluate those facts against business rules.
**Why:** Business rules change. If we bake rules into the prompt, the LLM will inevitably hallucinate exceptions or get confused by overlapping rules (e.g., Rule 3 vs Rule 1). Deterministic Python code guarantees that a PSU tender *always* goes to Aarti, making the system 100% testable and auditable.

### 2. Grounded Chat (Structured Queries)
**Decision:** The conversational interface executes SQL queries instead of dumping data into the prompt.
**Tradeoff:** This requires building a query-interpreter layer (translating English to `ChatQueryPlan`) rather than a simple RAG or prompt-injection layer.
**Why:** If the inbox processes 5,000 emails, dumping the dataset into the Gemini context window will cause an instant token overflow or hallucinated counts. By generating a SQL filter, the database executes the exact count/sum math, and we only pass the *aggregated result* to Gemini, guaranteeing O(1) LLM context size and eliminating math hallucinations.

### 3. Thread State Reconciliation
**Decision:** Treat `thread_id` as the primary key for a unit of work.
**Tradeoff:** We have to maintain state (`previous_state`, `is_updated`, `TaskEvent`) rather than treating every email as stateless.
**Why:** A real-world sales pipeline is conversation-based. If an initial email states a ₹25L budget, and a reply raises it to ₹32L, creating a second task would result in double-counting pipeline value. Our `PATCH` logic ensures pipeline metrics remain perfectly accurate.

### 4. Idempotency over Synchronous Errors
**Decision:** Handle duplicate emails silently rather than throwing 409 Conflict.
**Tradeoff:** The client receives a `200 OK` with `tasks_created: 0` instead of an error.
**Why:** In an operational webhook or automated pipeline, retries are common. If the pipeline re-runs a batch of 100 emails because the 99th failed, we must instantly skip the 98 already-processed emails without noisy errors.

### 5. Dead Letter Queue (DLQ) vs Silent Failures
**Decision:** Catch `Exception` on the LLM call and create a fallback `u_triage` task.
**Tradeoff:** It introduces noise to the triage queue if an API key expires.
**Why:** In an operations system, **data loss is the worst possible outcome**. If Gemini throws a `429 Quota Exceeded` error (very common on the free tier) or times out, a traditional app would throw a 500 and drop the email. Our DLQ approach guarantees the email still lands in a human's queue with an attached error trace.
