import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel

from backend.config import settings
from backend.database import db
from backend.services.gemini_service import gemini_service

logger = logging.getLogger("nova.routes.settings")
router = APIRouter(tags=["Settings & Search"])

class SettingsUpdateRequest(BaseModel):
    confidence_threshold: Optional[float] = None
    gemini_model: Optional[str] = None

@router.get("/settings")
def get_settings():
    return {
        "confidence_threshold": settings.CONFIDENCE_THRESHOLD,
        "gemini_model": settings.GEMINI_MODEL,
        "max_upload_size_mb": settings.MAX_UPLOAD_SIZE_MB,
        "is_gemini_configured": settings.is_gemini_configured,
        "is_mongodb_configured": settings.is_mongodb_configured,
        "db_status_message": db.status_message
    }

@router.patch("/settings")
def update_settings(payload: SettingsUpdateRequest):
    if payload.confidence_threshold is not None:
        if not (0.0 <= payload.confidence_threshold <= 1.0):
            raise HTTPException(status_code=400, detail="Confidence threshold must be between 0.0 and 1.0")
        settings.CONFIDENCE_THRESHOLD = payload.confidence_threshold

    if payload.gemini_model:
        settings.GEMINI_MODEL = payload.gemini_model.strip()
        gemini_service.reload_config()

    return {
        "success": True,
        "message": "Settings updated successfully",
        "settings": {
            "confidence_threshold": settings.CONFIDENCE_THRESHOLD,
            "gemini_model": settings.GEMINI_MODEL
        }
    }

@router.get("/search")
def global_search(q: str = Query(..., min_length=1)):
    """Search across meetings, tasks, and reviews."""
    term = q.lower()

    meetings = db.find_many("meetings", limit=100)
    matched_meetings = [
        m for m in meetings
        if term in m.get("title", "").lower() or term in (m.get("summary") or "").lower() or term in (m.get("transcript") or "").lower()
    ]

    tasks = db.find_many("tasks", limit=100)
    matched_tasks = [
        t for t in tasks
        if term in t.get("title", "").lower() or term in (t.get("assignee") or "").lower() or term in (t.get("description") or "").lower()
    ]

    reviews = db.find_many("reviews", limit=100)
    matched_reviews = [
        r for r in reviews
        if term in r.get("suggested_title", "").lower() or term in (r.get("suggested_assignee") or "").lower()
    ]

    return {
        "query": q,
        "meetings": matched_meetings[:10],
        "tasks": matched_tasks[:10],
        "reviews": matched_reviews[:10]
    }
