import logging
from datetime import datetime, timezone
from typing import Dict, Any, List
from backend.database import db

logger = logging.getLogger("nova.agents.supervisor")

class SupervisorAgent:
    """
    Supervisor Agent (Agent 1)
    - Receives meeting-processing requests.
    - Inspects available meeting content (transcript, media file, participants).
    - Plans and decides which processing steps are required.
    - Routes work through the agent workflow.
    - Tracks execution status and handles recoverable errors.
    """
    def __init__(self):
        self.name = "Supervisor Agent"

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

    def plan_workflow(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """
        Inspect input state and determine required execution stages.
        """
        meeting_id = state.get("meeting_id", "")
        start_time = datetime.now(timezone.utc).isoformat()
        
        has_transcript = bool(state.get("transcript"))
        has_media_file = bool(state.get("file_path"))
        
        steps = []
        if not has_transcript:
            if has_media_file:
                steps.append("transcription")
            else:
                err = "No transcript or media file provided for meeting processing."
                self.record_activity(
                    meeting_id=meeting_id,
                    action="Workflow Planning",
                    status="failed",
                    input_summary="Missing transcript and media file",
                    error_details=err,
                    start_time=start_time
                )
                return {
                    "supervisor_decision": "abort",
                    "planned_steps": [],
                    "errors": state.get("errors", []) + [err],
                    "status": "failed"
                }

        steps.extend(["extract_insights", "evaluate_assignments", "route_reviews_and_tasks"])

        output_summary = f"Planned steps: {', '.join(steps)}"
        self.record_activity(
            meeting_id=meeting_id,
            action="Workflow Planning & Task Decomposition",
            status="completed",
            input_summary=f"Media: {has_media_file}, Transcript Length: {len(state.get('transcript', ''))} chars",
            output_summary=output_summary,
            start_time=start_time
        )

        return {
            "supervisor_decision": "proceed",
            "planned_steps": steps,
            "current_step": steps[0] if steps else "done",
            "status": "processing"
        }

    def finalize_workflow(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """
        Produce final processing status and update meeting document.
        """
        meeting_id = state.get("meeting_id", "")
        start_time = datetime.now(timezone.utc).isoformat()
        errors = state.get("errors", [])

        persisted_tasks = state.get("persisted_tasks_count", 0)
        review_items = state.get("review_items_count", 0)

        final_status = "completed" if not errors else ("partial_success" if (persisted_tasks or review_items) else "failed")

        output = (
            f"Workflow finished with status: {final_status}. "
            f"Tasks Created: {persisted_tasks}, Sent to Review: {review_items}, Errors: {len(errors)}"
        )

        # Update meeting record in DB
        db.update("meetings", {"id": meeting_id}, {
            "status": final_status,
            "summary": state.get("summary", ""),
            "key_points": state.get("key_points", []),
            "decisions": state.get("decisions", []),
            "transcript": state.get("transcript", "")
        })

        self.record_activity(
            meeting_id=meeting_id,
            action="Finalize Processing",
            status=final_status,
            input_summary=f"Processed tasks: {persisted_tasks}, reviews: {review_items}",
            output_summary=output,
            error_details="; ".join(errors) if errors else "",
            start_time=start_time
        )

        return {
            "status": final_status,
            "final_summary": output
        }

supervisor_agent = SupervisorAgent()
