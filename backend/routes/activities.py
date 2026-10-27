import logging
from typing import List, Optional
from fastapi import APIRouter, Query

from backend.database import db
from backend.models.schemas import AgentActivityResponse

logger = logging.getLogger("nova.routes.activities")
router = APIRouter(prefix="/activities", tags=["Agent Activity"])

@router.get("", response_model=List[AgentActivityResponse])
def list_activities(
    meeting_id: Optional[str] = Query(None),
    agent_name: Optional[str] = Query(None),
    limit: int = Query(50, le=100)
):
    query = {}
    if isinstance(meeting_id, str):
        query["meeting_id"] = meeting_id
    if isinstance(agent_name, str) and agent_name != "all":
        query["agent_name"] = agent_name

    lim = int(limit) if isinstance(limit, (int, float, str)) and str(limit).isdigit() else 50
    activities = db.find_many("activities", query=query, sort_by="started_at", ascending=False, limit=lim)
    return activities
