import os
import shutil
import logging
from pathlib import Path
from typing import List, Optional
from uuid import uuid4
from fastapi import APIRouter, UploadFile, File, Form, BackgroundTasks, HTTPException, Query

from backend.config import settings, UPLOAD_DIR
from backend.database import db
from backend.models.schemas import MeetingResponse, MeetingUpdate
from backend.agents.agent_workflow import run_meeting_pipeline

logger = logging.getLogger("nova.routes.meetings")
router = APIRouter(prefix="/meetings", tags=["Meetings"])

ALLOWED_EXTENSIONS = {
    ".mp3", ".wav", ".m4a", ".ogg", ".aac", ".flac",
    ".mp4", ".webm", ".mov", ".avi", ".mkv", ".mpeg"
}

def _background_process_meeting(meeting_id: str):
    """Worker task executed in background thread."""
    meeting = db.find_one("meetings", {"id": meeting_id})
    if not meeting:
        return

    logger.info(f"Starting background LangGraph processing for meeting {meeting_id}")
    db.update("meetings", {"id": meeting_id}, {"status": "processing"})

    try:
        res = run_meeting_pipeline(
            meeting_id=meeting_id,
            meeting_title=meeting.get("title", "Untitled Meeting"),
            file_path=meeting.get("file_path"),
            transcript=meeting.get("transcript"),
            participants=meeting.get("participants", []),
            owner_name=meeting.get("owner_name")
        )
        logger.info(f"Completed processing for meeting {meeting_id}: {res.get('status')}")
    except Exception as e:
        logger.error(f"Background processing failure for meeting {meeting_id}: {e}")
        db.update("meetings", {"id": meeting_id}, {
            "status": "failed",
            "error_message": str(e)
        })

@router.post("/upload", response_model=MeetingResponse)
def upload_meeting(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    owner_name: Optional[str] = Form(None),
    participants: Optional[str] = Form(None),  # Comma-separated
    auto_process: bool = Form(False)
):
    """
    Upload an audio or video file, validate size/type, and persist meeting record.
    Optionally starts processing immediately.
    """
    # 1. Validate file extension
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Allowed formats: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    # 2. Generate safe unique filename
    meeting_id = str(uuid4())
    safe_name = f"{meeting_id}{ext}"
    dest_path = UPLOAD_DIR / safe_name

    # 3. Stream write file and enforce size limits
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    bytes_read = 0

    try:
        with open(dest_path, "wb") as buffer:
            while chunk := file.file.read(1024 * 1024):  # 1MB chunks
                bytes_read += len(chunk)
                if bytes_read > max_bytes:
                    buffer.close()
                    dest_path.unlink(missing_ok=True)
                    raise HTTPException(
                        status_code=413,
                        detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB} MB."
                    )
                buffer.write(chunk)
    except HTTPException:
        raise
    except Exception as e:
        dest_path.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=f"Failed to store uploaded file: {str(e)}")

    # 4. Parse participants
    parsed_participants = []
    if participants:
        parsed_participants = [p.strip() for p in participants.split(",") if p.strip()]

    # Determine media type
    media_type = "video" if ext in {".mp4", ".webm", ".mov", ".avi", ".mkv", ".mpeg"} else "audio"

    # Display title fallback
    display_title = title.strip() if (title and title.strip()) else Path(file.filename or "Meeting").stem

    meeting_doc = {
        "id": meeting_id,
        "title": display_title,
        "filename": file.filename,
        "file_path": str(dest_path),
        "file_size": bytes_read,
        "media_type": media_type,
        "duration_seconds": None,
        "participants": parsed_participants,
        "owner_name": owner_name.strip() if owner_name else None,
        "status": "uploaded",
        "error_message": None,
        "transcript": None,
        "summary": None,
        "key_points": [],
        "decisions": []
    }

    created = db.insert("meetings", meeting_doc)

    if auto_process:
        background_tasks.add_task(_background_process_meeting, meeting_id)

    return created

@router.get("", response_model=List[MeetingResponse])
def list_meetings(
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, le=100)
):
    query = {}
    if isinstance(status, str) and status != "all":
        query["status"] = status

    lim = int(limit) if isinstance(limit, (int, float, str)) and str(limit).isdigit() else 50
    meetings = db.find_many("meetings", query=query, sort_by="created_at", ascending=False, limit=lim)

    if isinstance(search, str) and search.strip():
        search_lower = search.lower()
        meetings = [
            m for m in meetings
            if search_lower in m.get("title", "").lower() or search_lower in (m.get("summary") or "").lower()
        ]

    return meetings

@router.get("/{meeting_id}", response_model=MeetingResponse)
def get_meeting(meeting_id: str):
    meeting = db.find_one("meetings", {"id": meeting_id})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting

@router.get("/{meeting_id}/transcript")
def get_meeting_transcript(meeting_id: str):
    meeting = db.find_one("meetings", {"id": meeting_id})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return {
        "meeting_id": meeting_id,
        "title": meeting.get("title"),
        "transcript": meeting.get("transcript"),
        "has_transcript": bool(meeting.get("transcript"))
    }

@router.post("/{meeting_id}/process")
def process_meeting(
    meeting_id: str,
    background_tasks: BackgroundTasks
):
    """
    Trigger LangGraph Multi-Agent pipeline for an existing meeting.
    Runs asynchronously in the background.
    """
    meeting = db.find_one("meetings", {"id": meeting_id})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    if meeting.get("status") == "processing":
        return {"status": "processing", "message": "Meeting is already being processed."}

    db.update("meetings", {"id": meeting_id}, {"status": "processing", "error_message": None})
    background_tasks.add_task(_background_process_meeting, meeting_id)

    return {
        "status": "processing",
        "message": "AI multi-agent processing pipeline initiated.",
        "meeting_id": meeting_id
    }

@router.get("/{meeting_id}/status")
def get_meeting_status(meeting_id: str):
    meeting = db.find_one("meetings", {"id": meeting_id})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    tasks_count = db.count("tasks", {"meeting_id": meeting_id})
    reviews_count = db.count("reviews", {"meeting_id": meeting_id, "status": "pending"})

    return {
        "meeting_id": meeting_id,
        "status": meeting.get("status"),
        "error_message": meeting.get("error_message"),
        "has_transcript": bool(meeting.get("transcript")),
        "tasks_count": tasks_count,
        "reviews_count": reviews_count,
        "updated_at": meeting.get("updated_at")
    }

@router.delete("/{meeting_id}")
def delete_meeting(meeting_id: str):
    meeting = db.find_one("meetings", {"id": meeting_id})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    # Delete physical file if present
    file_path = meeting.get("file_path")
    if file_path and os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception as e:
            logger.warning(f"Failed to remove file {file_path}: {e}")

    # Remove associated tasks and reviews
    tasks = db.find_many("tasks", {"meeting_id": meeting_id})
    for t in tasks:
        db.delete("tasks", {"id": t["id"]})

    reviews = db.find_many("reviews", {"meeting_id": meeting_id})
    for r in reviews:
        db.delete("reviews", {"id": r["id"]})

    db.delete("meetings", {"id": meeting_id})
    return {"success": True, "message": "Meeting and associated records deleted"}
