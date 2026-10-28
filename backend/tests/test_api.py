import io
import pytest
from fastapi import HTTPException, UploadFile, BackgroundTasks
from backend.main import health_check
from backend.routes.meetings import (
    upload_meeting, list_meetings, get_meeting, get_meeting_status, delete_meeting
)
from backend.routes.tasks import (
    list_tasks, get_task, update_task, trigger_task_reminder, create_task
)
from backend.routes.reviews import (
    list_reviews, approve_review, reject_review
)
from backend.routes.analytics import get_analytics
from backend.routes.settings import (
    get_settings, update_settings, global_search, SettingsUpdateRequest
)
from backend.models.schemas import TaskUpdate, TaskCreate, ReviewApprovalRequest
from backend.database import db

def test_health_check_endpoint():
    res = health_check()
    assert res["status"] == "healthy"
    assert "gemini" in res
    assert "database" in res
    assert res["confidence_threshold"] == 0.70

def test_upload_invalid_file_format():
    fake_file = UploadFile(
        file=io.BytesIO(b"malicious exe payload"),
        filename="malware.exe"
    )
    bg = BackgroundTasks()
    with pytest.raises(HTTPException) as exc_info:
        upload_meeting(
            background_tasks=bg,
            file=fake_file,
            title="Dangerous Meeting"
        )
    assert exc_info.value.status_code == 400
    assert "Unsupported file format" in exc_info.value.detail

def test_upload_valid_audio_meeting():
    content = b"Simulated mp3 audio chunk content"
    fake_file = UploadFile(
        file=io.BytesIO(content),
        filename="09-15-2026-Council-Meeting.mp3"
    )
    bg = BackgroundTasks()
    meeting = upload_meeting(
        background_tasks=bg,
        file=fake_file,
        title="Council Budget Session",
        owner_name="CEO",
        participants="CEO, Christy Groenheide, Melinda Warren",
        auto_process=False
    )
    assert meeting["title"] == "Council Budget Session"
    assert meeting["owner_name"] == "CEO"
    assert len(meeting["participants"]) == 3
    assert meeting["status"] == "uploaded"

    meeting_id = meeting["id"]
    fetched = get_meeting(meeting_id)
    assert fetched["id"] == meeting_id

    status_data = get_meeting_status(meeting_id)
    assert status_data["status"] == "uploaded"

def test_tasks_crud_flow():
    # 1. Create task
    new_task = create_task(TaskCreate(
        meeting_id="m-test-101",
        title="Finalize Q4 report",
        assignee="Sarah Connor",
        due_date="2026-11-01",
        priority="high",
        status="pending",
        confidence=0.92
    ))
    task_id = new_task["id"]
    assert new_task["title"] == "Finalize Q4 report"

    # 2. List tasks
    tasks = list_tasks(status="pending")
    assert any(t["id"] == task_id for t in tasks)

    # 3. Patch task (mark completed)
    updated = update_task(task_id, TaskUpdate(status="completed"))
    assert updated["status"] == "completed"

def test_human_review_approval_and_rejection():
    # Insert pending review item
    review = db.insert("reviews", {
        "meeting_id": "m-rev-202",
        "meeting_title": "City Council",
        "suggested_title": "Tristan Vantage to provide soccer ball",
        "suggested_assignee": "Tristan Vantage",
        "suggested_due_date": "Next Monday",
        "suggested_priority": "medium",
        "confidence": 0.60,
        "reason_for_review": "Low confidence (60%) — needs human review",
        "supporting_evidence": "Tristan Vantage mentioned soccer ball sponsorship",
        "status": "pending"
    })
    review_id = review["id"]

    # Verify in list
    pending_list = list_reviews(status="pending")
    assert any(r["id"] == review_id for r in pending_list)

    # Approve item with modified title
    approved_res = approve_review(
        review_id=review_id,
        payload=ReviewApprovalRequest(title="Approved: Tristan Vantage signed soccer ball", assignee="Tristan Vantage")
    )
    assert approved_res["success"] is True
    assert approved_res["task"]["title"] == "Approved: Tristan Vantage signed soccer ball"
    assert approved_res["task"]["confidence"] == 1.0

    # Test rejection with second item
    review2 = db.insert("reviews", {
        "meeting_id": "m-rev-203",
        "suggested_title": "Discarded idea",
        "confidence": 0.30,
        "reason_for_review": "Vague mention",
        "supporting_evidence": "someone said maybe",
        "status": "pending"
    })
    reject_res = reject_review(review2["id"])
    assert reject_res["success"] is True

def test_analytics_and_settings():
    analytics = get_analytics()
    assert analytics["total_meetings"] >= 1
    assert "completion_rate" in analytics
    assert "agent_success_rate" in analytics

    # Test settings patch
    updated_settings = update_settings(SettingsUpdateRequest(confidence_threshold=0.72))
    assert updated_settings["settings"]["confidence_threshold"] == 0.72

    # Test search
    search_res = global_search(q="Council")
    assert len(search_res["meetings"]) >= 1
