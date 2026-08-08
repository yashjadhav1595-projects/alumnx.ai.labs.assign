import requests
import json
import time

BASE_URL = "http://127.0.0.1:8000"

def run_tests():
    print("Starting Adversarial Tests...")
    
    # Clean state - We can't easily clean via API unless we add a test endpoint, 
    # but we can use a unique candidate ID so it's isolated.
    ts = int(time.time())
    cid = f"test_{ts}@alumnx.com"
    e1_id = f"t1_e1_{ts}"
    e2_id = f"t1_e2_{ts}"
    e3_id = f"t1_e3_{ts}"
    
    # --- TEST 1: ROUTING EDGE CASES ---
    # 1. PSU tender with low value (Rule 3 beats Rule 1)
    # 2. SEO vendor spam (should SKIP)
    # 3. Conflicting intent (should TRIAGE)
    print("\n--- TEST 1: ROUTING EDGE CASES ---")
    emails = [
        {
            "email_id": e1_id,
            "thread_id": "t1_th1",
            "from_name": "Gov Procurement",
            "from_email": "procurement@nic.in",
            "subject": "PSU Tender Notice",
            "body": "Please submit your proposal for this government PSU tender worth INR 6.5L.",
            "received_at": "2026-08-01T10:00:00Z"
        },
        {
            "email_id": e2_id,
            "thread_id": "t1_th2",
            "from_name": "Growth Agency",
            "from_email": "hello@growthhackers.io",
            "subject": "Increase your SEO rankings",
            "body": "We provide premium SEO services and marketing growth partnerships. Can we schedule a call?",
            "received_at": "2026-08-01T10:05:00Z"
        },
        {
            "email_id": e3_id,
            "thread_id": "t1_th3",
            "from_name": "Confused Client",
            "from_email": "client@example.com",
            "subject": "Evaluate platform AND sponsor webinar",
            "body": "We'd like to evaluate your platform and also discuss sponsoring your webinar.",
            "received_at": "2026-08-01T10:10:00Z"
        }
    ]
    
    # Ingest one by one to respect Gemini 15 RPM free tier limit (4s per request)
    res_list = []
    for email in emails:
        r = requests.post(f"{BASE_URL}/ingest", json={"candidate_id": cid, "emails": [email]}).json()
        res_list.append(r)
        time.sleep(4)
        
    print(f"Ingest Results: {res_list}")
    total_processed = sum(r.get('processed', 0) for r in res_list)
    assert total_processed == 3
    
    tasks_res = requests.get(f"{BASE_URL}/api/tasks?candidate_id={cid}").json()
    tasks = {t['source_email_id']: t for t in tasks_res['tasks']}
    logs = {l['email_id']: l for l in tasks_res['logs']}
    
    # Assertions
    assert e1_id in tasks, "PSU tender should create a task"
    assert tasks[e1_id]["assignee_id"] == "u_aarti", "PSU tender should route to Aarti despite low value"
    
    assert logs[e2_id]["status"] == "skipped", "SEO spam should be skipped"
    assert e2_id not in tasks, "SEO spam should NOT create a task"
    
    assert e3_id in tasks, "Conflicting intent should create a task"
    assert tasks[e3_id]["assignee_id"] == "u_triage", "Conflicting intent should route to triage"
    print("✅ TEST 1 PASSED")
    
    # --- TEST 2: IDEMPOTENCY ---
    print("\n--- TEST 2: IDEMPOTENCY ---")
    res2 = requests.post(f"{BASE_URL}/ingest", json={"candidate_id": cid, "emails": emails}).json()
    print(f"Ingest Result (Duplicate): {res2}")
    assert res2['processed'] == 0, "Duplicate emails should not be processed again"
    assert res2['tasks_created'] == 0
    assert res2['tasks_updated'] == 0
    print("✅ TEST 2 PASSED")
    
    # --- TEST 3: THREAD RECONCILIATION ---
    print("\n--- TEST 3: THREAD RECONCILIATION ---")
    reply = {
        "email_id": f"{e1_id}_reply",
        "thread_id": "t1_th1",
        "from_name": "Gov Procurement",
        "from_email": "procurement@nic.in",
        "subject": "Re: PSU Tender Notice",
        "body": "Update: The budget for the PSU tender has been increased to INR 12.5L.",
        "received_at": "2026-08-02T10:00:00Z"
    }
    res3 = requests.post(f"{BASE_URL}/ingest", json={"candidate_id": cid, "emails": [reply]}).json()
    print(f"Ingest Result (Reply): {res3}")
    assert res3['processed'] == 1
    assert res3['tasks_updated'] == 1
    assert res3['tasks_created'] == 0
    
    tasks_res = requests.get(f"{BASE_URL}/api/tasks?candidate_id={cid}").json()
    tasks_by_thread = [t for t in tasks_res['tasks'] if t['thread_id'] == 't1_th1']
    assert len(tasks_by_thread) == 1, "Should only have one task for the thread"
    assert tasks_by_thread[0]["is_updated"] == True, "Task should be marked as updated"
    print("✅ TEST 3 PASSED")
    
    # --- TEST 4: GROUNDED CHAT TRAPS ---
    print("\n--- TEST 4: GROUNDED CHAT TRAPS ---")
    
    time.sleep(4)
    # Trap 1: Zero Matches
    chat1 = requests.post(f"{BASE_URL}/api/chat", json={
        "candidate_id": cid,
        "query": "How many emails were about GST refunds?"
    }).json()
    print(f"Chat (Zero Matches): {chat1['answer']}")
    assert "0" in chat1['answer'] or "zero" in chat1['answer'].lower(), "Must state zero matches clearly"
    
    # Trap 2: Out of Scope
    chat2 = requests.post(f"{BASE_URL}/api/chat", json={
        "candidate_id": cid,
        "query": "Send Aarti an email to hurry up on the PSU tender."
    }).json()
    print(f"Chat (Out of Scope): {chat2['answer']}")
    assert "I cannot take actions" in chat2['answer'] or "outside this scope" in chat2['answer'] or "cannot" in chat2['answer'].lower() or "only answer" in chat2['answer'].lower(), "Must refuse out-of-scope actions"
    
    print("✅ TEST 4 PASSED")
    print("\n🎉 ALL ADVERSARIAL TESTS PASSED SUCCESSFULLY! 🎉")

if __name__ == "__main__":
    run_tests()
