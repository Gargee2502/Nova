import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List
from backend.services.gemini_service import gemini_service
from backend.database import db

logger = logging.getLogger("nova.agents.extraction")

class MeetingExtractionAgent:
    """
    Meeting Extraction Agent (Agent 2)
    - Analyzes transcript or supported meeting media.
    - Generates a concise meeting summary.
    - Extracts discussion topics and key decisions.
    - Identifies explicit action items with verbatim supporting evidence.
    - Returns structured, validated data.
    """
    def __init__(self):
        self.name = "Meeting Extraction Agent"

    def record_activity(
        self,
        meeting_id: str,
        action: str,
        status: str,
        input_summary: str = "",
        output_summary: str = "",
        error_details: str = "",
        start_time: str = ""
    ) -> Dict[str, Any]:
        now = datetime.now(timezone.utc).isoformat()
        activity = {
            "meeting_id": meeting_id,
            "agent_name": self.name,
            "action": action,
            "status": status,
            "input_summary": input_summary,
            "output_summary": output_summary,
            "error_details": error_details,
            "started_at": start_time or now,
            "completed_at": now
        }
        return db.insert("activities", activity)

    def extract(self, state: Dict[str, Any]) -> Dict[str, Any]:
        meeting_id = state.get("meeting_id", "")
        start_time = datetime.now(timezone.utc).isoformat()
        
        transcript = state.get("transcript", "")
        file_path_str = state.get("file_path", "")

        # Stage 1: Transcription if transcript is empty
        if not transcript and file_path_str:
            file_path = Path(file_path_str)
            if file_path.exists():
                try:
                    self.record_activity(
                        meeting_id=meeting_id,
                        action="Audio/Video Transcription",
                        status="started",
                        input_summary=f"File: {file_path.name} ({file_path.stat().st_size} bytes)",
                        start_time=start_time
                    )
                    transcript = gemini_service.transcribe_media(file_path)
                    
                    # Save transcript to meeting in DB
                    db.update("meetings", {"id": meeting_id}, {"transcript": transcript})
                    
                    self.record_activity(
                        meeting_id=meeting_id,
                        action="Audio/Video Transcription",
                        status="completed",
                        output_summary=f"Transcribed {len(transcript)} characters",
                        start_time=start_time
                    )
                except Exception as e:
                    err = f"Transcription failed: {str(e)}"
                    logger.error(err)
                    self.record_activity(
                        meeting_id=meeting_id,
                        action="Audio/Video Transcription",
                        status="failed",
                        error_details=err,
                        start_time=start_time
                    )
                    return {
                        "errors": state.get("errors", []) + [err],
                        "status": "failed"
                    }

        if not transcript:
            err = "No transcript content available for extraction."
            return {
                "errors": state.get("errors", []) + [err],
                "status": "failed"
            }

        # Stage 2: Insights and Action Item Extraction
        try:
            self.record_activity(
                meeting_id=meeting_id,
                action="Meeting Insights & Action Item Extraction",
                status="started",
                input_summary=f"Transcript: {len(transcript)} chars, Participants: {state.get('participants')}",
                start_time=start_time
            )

            insights = gemini_service.extract_meeting_insights(
                transcript=transcript,
                meeting_title=state.get("meeting_title", "Meeting"),
                participants=state.get("participants", [])
            )

            summary = insights.get("summary", "")
            key_points = insights.get("key_points", [])
            decisions = insights.get("decisions", [])
            raw_action_items = insights.get("raw_action_items", [])

            self.record_activity(
                meeting_id=meeting_id,
                action="Meeting Insights & Action Item Extraction",
                status="completed",
                input_summary=f"Analyzed {len(transcript)} characters",
                output_summary=f"Extracted {len(decisions)} decisions, {len(key_points)} key points, {len(raw_action_items)} action items",
                start_time=start_time
            )

            return {
                "transcript": transcript,
                "summary": summary,
                "key_points": key_points,
                "decisions": decisions,
                "raw_action_items": raw_action_items,
                "status": "processing"
            }

        except Exception as e:
            err = f"Extraction failed: {str(e)}"
            logger.error(err)
            self.record_activity(
                meeting_id=meeting_id,
                action="Meeting Insights & Action Item Extraction",
                status="failed",
                error_details=err,
                start_time=start_time
            )
            return {
                "errors": state.get("errors", []) + [err],
                "status": "failed"
            }

meeting_extraction_agent = MeetingExtractionAgent()
