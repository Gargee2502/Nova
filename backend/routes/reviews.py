import logging
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query

from backend.database import db
from backend.models.schemas import ReviewResponse, ReviewApprovalRequest

logger = logging.getLogger("nova.routes.reviews")
router = APIRouter(prefix="/reviews", tags=["Human Review"])

@router.get("", response_model=List[ReviewResponse])
def list_reviews(
    status: Optional[str] = Query("pending"),
    meeting_id: Optional[str] = Query(None),
    limit: int = Query(50, le=100)
):
    query = {}
    if isinstance(status, str) and status != "all":
        query["status"] = status
    if isinstance(meeting_id, str):
        query["meeting_id"] = meeting_id

    lim = int(limit) if isinstance(limit, (int, float, str)) and str(limit).isdigit() else 50
    reviews = db.find_many("reviews", query=query, sort_by="created_at", ascending=False, limit=lim)
    return reviews

@router.post("/{review_id}/approve")
def approve_review(review_id: str, payload: Optional[ReviewApprovalRequest] = None):
    """
    Human-in-the-Loop Approval:
    Allows user to edit task or assignee, approves item, and promotes it to a confirmed Task.
    """
    review = db.find_one("reviews", {"id": review_id})
    if not review:
        raise HTTPException(status_code=404, detail="Review item not found")

    if review.get("status") != "pending":
        raise HTTPException(status_code=400, detail=f"Review item is already {review.get('status')}")

    final_title = (payload.title if payload and payload.title else review.get("suggested_title", "")).strip()
    final_assignee = (payload.assignee if payload and payload.assignee else review.get("suggested_assignee", "")).strip() or "Unassigned"
    final_due_date = payload.due_date if payload and payload.due_date else review.get("suggested_due_date")
    final_priority = payload.priority if payload and payload.priority else review.get("suggested_priority", "medium")

    # 1. Create confirmed task
    task_doc = {
        "meeting_id": review.get("meeting_id"),
        "title": final_title,
        "description": f"Approved via Human Review. Supporting evidence: {review.get('supporting_evidence', '')}",
        "assignee": final_assignee,
        "due_date": final_due_date,
        "priority": final_priority,
        "status": "pending",
        "confidence": 1.0,  # Human verified
        "evidence": review.get("supporting_evidence"),
        "reminders_sent": 0,
        "last_reminded_at": None
    }
    created_task = db.insert("tasks", task_doc)

    # 2. Update review status
    now = datetime.now(timezone.utc).isoformat()
    db.update("reviews", {"id": review_id}, {
        "status": "approved",
        "resolved_at": now
    })

    # 3. Log agent/human activity
    db.insert("activities", {
        "meeting_id": review.get("meeting_id"),
        "agent_name": "Human Reviewer",
        "action": "Human Approval",
        "status": "completed",
        "input_summary": f"Review Item: {review.get('suggested_title')}",
        "output_summary": f"Approved & Created Task: '{final_title}' assigned to {final_assignee}",
        "started_at": now,
        "completed_at": now
    })

    return {
        "success": True,
        "message": "Item approved and converted to active task.",
        "task": created_task
    }

@router.post("/{review_id}/reject")
def reject_review(review_id: str):
    """
    Human-in-the-Loop Rejection:
    Discards the uncertain item from task conversion.
    """
    review = db.find_one("reviews", {"id": review_id})
    if not review:
        raise HTTPException(status_code=404, detail="Review item not found")

    now = datetime.now(timezone.utc).isoformat()
    db.update("reviews", {"id": review_id}, {
        "status": "rejected",
        "resolved_at": now
    })

    db.insert("activities", {
        "meeting_id": review.get("meeting_id"),
        "agent_name": "Human Reviewer",
        "action": "Human Rejection",
        "status": "completed",
        "input_summary": f"Review Item: {review.get('suggested_title')}",
        "output_summary": f"Rejected by user. Item will not be created as task.",
        "started_at": now,
        "completed_at": now
    })

    return {"success": True, "message": "Review item rejected."}
