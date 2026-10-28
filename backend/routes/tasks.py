import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query

from backend.database import db
from backend.models.schemas import TaskResponse, TaskUpdate, TaskCreate
from backend.agents.agent4 import followup_agent

logger = logging.getLogger("nova.routes.tasks")
router = APIRouter(prefix="/tasks", tags=["Tasks"])

@router.get("", response_model=List[TaskResponse])
def list_tasks(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    assignee: Optional[str] = Query(None),
    meeting_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(100, le=200)
):
    query = {}
    if isinstance(status, str) and status != "all":
        query["status"] = status
    if isinstance(priority, str) and priority != "all":
        query["priority"] = priority
    if isinstance(assignee, str) and assignee != "all":
        query["assignee"] = assignee
    if isinstance(meeting_id, str):
        query["meeting_id"] = meeting_id

    lim = int(limit) if isinstance(limit, (int, float, str)) and str(limit).isdigit() else 100
    tasks = db.find_many("tasks", query=query, sort_by="created_at", ascending=False, limit=lim)

    if isinstance(search, str) and search.strip():
        search_lower = search.lower()
        tasks = [
            t for t in tasks
            if search_lower in t.get("title", "").lower()
            or search_lower in (t.get("assignee") or "").lower()
            or search_lower in (t.get("description") or "").lower()
        ]

    return tasks

@router.get("/{task_id}", response_model=TaskResponse)
def get_task(task_id: str):
    task = db.find_one("tasks", {"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@router.post("", response_model=TaskResponse)
def create_task(task_in: TaskCreate):
    new_task = db.insert("tasks", task_in.model_dump())
    return new_task

@router.patch("/{task_id}", response_model=TaskResponse)
def update_task(task_id: str, updates: TaskUpdate):
    task = db.find_one("tasks", {"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    update_dict = {k: v for k, v in updates.model_dump().items() if v is not None}
    if update_dict:
        db.update("tasks", {"id": task_id}, update_dict)

    updated = db.find_one("tasks", {"id": task_id})
    return updated

@router.post("/{task_id}/remind")
def trigger_task_reminder(
    task_id: str,
    email: Optional[str] = Query(None)
):
    """Trigger the Follow-Up Agent to draft and send a reminder."""
    result = followup_agent.trigger_reminder_for_task(task_id, recipient_email=email)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("message", "Failed to send reminder"))
    return result

@router.delete("/{task_id}")
def delete_task(task_id: str):
    task = db.find_one("tasks", {"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete("tasks", {"id": task_id})
    return {"success": True, "message": "Task deleted"}
