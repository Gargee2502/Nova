from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

# ==================== MEETING SCHEMAS ====================

class MeetingCreate(BaseModel):
    title: Optional[str] = None
    owner_name: Optional[str] = None
    participants: Optional[List[str]] = Field(default_factory=list)

class MeetingUpdate(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    decisions: Optional[List[str]] = None
    key_points: Optional[List[str]] = None
    status: Optional[str] = None
    error_message: Optional[str] = None

class MeetingResponse(BaseModel):
    id: str
    title: str
    filename: Optional[str] = "recording.mp3"
    file_path: Optional[str] = None
    file_size: int = 0
    media_type: str = "audio"
    duration_seconds: Optional[float] = None
    participants: List[str] = Field(default_factory=list)
    owner_name: Optional[str] = None
    status: str = "uploaded"  # uploaded, processing, completed, failed
    error_message: Optional[str] = None
    transcript: Optional[str] = None
    summary: Optional[str] = None
    key_points: List[str] = Field(default_factory=list)
    decisions: List[str] = Field(default_factory=list)
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

# ==================== TASK / ACTION ITEM SCHEMAS ====================

class TaskCreate(BaseModel):
    meeting_id: str
    title: str
    description: Optional[str] = None
    assignee: Optional[str] = None
    due_date: Optional[str] = None
    priority: str = "medium"  # high, medium, low
    status: str = "pending"   # pending, completed, cancelled
    confidence: float = 0.85
    evidence: Optional[str] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assignee: Optional[str] = None
    due_date: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None

class TaskResponse(BaseModel):
    id: str
    meeting_id: str
    title: str
    description: Optional[str] = None
    assignee: Optional[str] = None
    due_date: Optional[str] = None
    priority: str = "medium"
    status: str = "pending"
    confidence: float = 1.0
    evidence: Optional[str] = None
    reminders_sent: int = 0
    last_reminded_at: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

# ==================== HUMAN REVIEW SCHEMAS ====================

class ReviewResponse(BaseModel):
    id: str
    meeting_id: str
    meeting_title: Optional[str] = None
    suggested_title: str
    suggested_assignee: Optional[str] = None
    suggested_due_date: Optional[str] = None
    suggested_priority: str = "medium"
    confidence: float = 0.5
    reason_for_review: str = "Evaluation review"
    supporting_evidence: str = ""
    status: str = "pending"  # pending, approved, rejected
    created_at: Optional[str] = None
    resolved_at: Optional[str] = None

class ReviewApprovalRequest(BaseModel):
    title: Optional[str] = None
    assignee: Optional[str] = None
    due_date: Optional[str] = None
    priority: Optional[str] = "medium"

# ==================== AGENT ACTIVITY SCHEMAS ====================

class AgentActivityResponse(BaseModel):
    id: str
    meeting_id: Optional[str] = None
    agent_name: str
    action: str
    status: str  # started, completed, failed, routed
    input_summary: Optional[str] = None
    output_summary: Optional[str] = None
    error_details: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    duration_ms: Optional[float] = None

# ==================== ANALYTICS & SETTINGS ====================

class AnalyticsResponse(BaseModel):
    total_meetings: int
    successful_meetings: int
    failed_meetings: int
    total_tasks: int
    pending_tasks: int
    completed_tasks: int
    completion_rate: float
    pending_reviews: int
    approved_reviews: int
    rejected_reviews: int
    agent_success_rate: float
    avg_processing_time_seconds: float
    tasks_by_priority: Dict[str, int]
    recent_activities: List[Dict[str, Any]]
    meeting_trends: List[Dict[str, Any]]

class AppSettings(BaseModel):
    confidence_threshold: float = 0.70
    gemini_model: str = "gemini-2.5-flash"
    max_upload_size_mb: int = 200
    is_gemini_configured: bool = False
    is_mongodb_configured: bool = False
    db_status_message: str = ""
