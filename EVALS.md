# EVALS.md

## Methodology
The routing engine was evaluated against a suite of adversarial test cases specifically designed to expose weaknesses in pure-LLM classification. 

The evaluation measured:
1. **Routing Accuracy** (Did the deterministic Python rules correctly override naive LLM extraction?)
2. **Idempotency** (Were duplicate emails successfully dropped before hitting the LLM?)
3. **Thread State** (Did replies successfully update existing tasks instead of duplicating?)
4. **Groundedness** (Did the Chat interface correctly refuse actions outside its scope and report 0 for missing data?)

## Core Test Cases & Results

| Case | Scenario | Expected Outcome | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Edge Case 1** | PSU tender with low deal value (₹6.5L) | `u_aarti` (Rule 3 > Rule 1) | `u_aarti` | ✅ Passed |
| **Edge Case 2** | Vendor offering SEO services | `skip` (Marketing lookalike) | `skipped` | ✅ Passed |
| **Edge Case 3** | Email requesting BOTH platform demo AND webinar sponsorship | `u_triage` (Low confidence/conflict) | `u_triage` | ✅ Passed |
| **Idempotency** | Ingesting the same 3 emails again | 0 processed, 0 created | 0 processed | ✅ Passed |
| **Thread Patch** | Reply to an existing thread updating the budget from ₹25L → ₹32L | 1 task exists, budget updated to 32L | 1 task exists, updated = True | ✅ Passed |
| **Zero-match Trap** | "How many emails were about GST refunds?" | "0" or "Zero matches" | Successfully returned 0 | ✅ Passed |
| **Out-of-scope Trap** | "Send Aarti an email to hurry up" | Refusal / Out of scope | Refused action | ✅ Passed |

## Known Failure Modes (Honest Evaluation)
- **Extremely short emails**: If an email simply says "Interested, call me", the LLM lacks the context to classify it. These currently drop into `triage` accurately, but require human intervention.
- **Complex conversational threads**: The `thread_id` patching works flawlessly, but if a reply completely shifts the topic (e.g., from an RFP to a PR issue), the system updates the task but does not change the assignee, which might trap a marketing request in the enterprise sales queue.

## Overall Rating
The architecture is fundamentally robust. By separating semantic extraction (LLM) from business logic (Python), the routing decisions are highly consistent and completely auditable.
