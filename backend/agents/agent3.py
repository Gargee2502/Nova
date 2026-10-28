import logging
from datetime import datetime, timezone
from typing import Dict, Any, List
from backend.services.gemini_service import gemini_service
from backend.config import settings
from backend.database import db

logger = logging.getLogger("nova.agents.assignment")

class AssignmentAgent:
    """
    Assignment Agent (Agent 3)
    - Identifies responsible person when meeting provides sufficient evidence.
    - Matches names against supplied participant information and owner.
    - Extracts due dates and priorities.
    - Computes confidence scores with supporting evidence.
    - Routes ambiguous or low-confidence (< threshold) assignments to Human Review.
    """
    def __init__(self):
        self.name = "Assignment Agent"

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

    def process_assignments(self, state: Dict[str, Any]) -> Dict[str, Any]:
        meeting_id = state.get("meeting_id", "")
        start_time = datetime.now(timezone.utc).isoformat()
        
        raw_items = state.get("raw_action_items", [])
        participants = state.get("participants", [])
        meeting_owner = state.get("owner_name", "")
        threshold = state.get("confidence_threshold", settings.CONFIDENCE_THRESHOLD)

        self.record_activity(
            meeting_id=meeting_id,
            action="Action Item & Assignment Evaluation",
            status="started",
            input_summary=f"Evaluating {len(raw_items)} raw items against threshold {threshold}",
            start_time=start_time
        )

        persisted_tasks_count = 0
        review_items_count = 0
        evaluated_items = []

        for item in raw_items:
            title = item.get("title", "").strip()
            evidence = item.get("evidence", "").strip()
            suggested_owner = item.get("suggested_owner")
            suggested_deadline = item.get("suggested_deadline")
            priority = item.get("priority", "medium").lower()

            try:
                # Call Gemini to analyze the assignment rigorously
                eval_res = gemini_service.analyze_assignment(
                    action_item_title=title,
                    evidence=evidence,
                    suggested_owner=suggested_owner,
                    suggested_deadline=suggested_deadline,
                    suggested_priority=priority,
                    participants=participants,
                    meeting_owner=meeting_owner
                )

                assignee = eval_res.get("assignee")
                due_date = eval_res.get("due_date")
                confidence = float(eval_res.get("confidence", 0.5))
                reason = eval_res.get("confidence_reason", "Automated evaluation")
                eval_priority = eval_res.get("priority", priority)

                # Confidence Evaluation and Conditional Routing
                if confidence >= threshold and assignee:
                    # Persist as confirmed Task
                    task_doc = {
                        "meeting_id": meeting_id,
                        "title": title,
                        "description": f"Extracted from meeting. Evidence: {evidence}",
                        "assignee": assignee,
                        "due_date": due_date,
                        "priority": eval_priority,
                        "status": "pending",
                        "confidence": confidence,
                        "evidence": evidence,
                        "reminders_sent": 0,
                        "last_reminded_at": None
                    }
                    saved_task = db.insert("tasks", task_doc)
                    persisted_tasks_count += 1
                    
                    self.record_activity(
                        meeting_id=meeting_id,
                        action="Task Persisted",
                        status="completed",
                        input_summary=f"Task: {title}",
                        output_summary=f"Assigned to {assignee} (Confidence: {int(confidence*100)}%)",
                        start_time=start_time
                    )
                else:
                    # Route to Human Review queue
                    review_doc = {
                        "meeting_id": meeting_id,
                        "meeting_title": state.get("meeting_title", "Untitled Meeting"),
                        "suggested_title": title,
                        "suggested_assignee": assignee or suggested_owner,
                        "suggested_due_date": due_date or suggested_deadline,
                        "suggested_priority": eval_priority,
                        "confidence": confidence,
                        "reason_for_review": reason if reason else f"Low confidence ({int(confidence*100)}% < {int(threshold*100)}%) or ambiguous owner.",
                        "supporting_evidence": evidence or "Mentioned during meeting discussion.",
                        "status": "pending",
                        "resolved_at": None
                    }
                    db.insert("reviews", review_doc)
                    review_items_count += 1

                    self.record_activity(
                        meeting_id=meeting_id,
                        action="Routed to Human Review",
                        status="routed",
                        input_summary=f"Task: {title}",
                        output_summary=f"Review queued: {reason} (Confidence: {int(confidence*100)}%)",
                        start_time=start_time
                    )

                evaluated_items.append({
                    "title": title,
                    "assignee": assignee,
                    "confidence": confidence,
                    "routed_to": "tasks" if (confidence >= threshold and assignee) else "reviews"
                })

            except Exception as e:
                logger.error(f"Error evaluating assignment for '{title}': {e}")
                # Safe fallback: route to review rather than discarding or hallucinating
                fallback_review = {
                    "meeting_id": meeting_id,
                    "meeting_title": state.get("meeting_title", "Untitled Meeting"),
                    "suggested_title": title,
                    "suggested_assignee": suggested_owner,
                    "suggested_due_date": suggested_deadline,
                    "suggested_priority": priority,
                    "confidence": 0.50,
                    "reason_for_review": f"Evaluation error: {str(e)[:100]}. Routed for human verification.",
                    "supporting_evidence": evidence,
                    "status": "pending",
                    "resolved_at": None
                }
                db.insert("reviews", fallback_review)
                review_items_count += 1

        self.record_activity(
            meeting_id=meeting_id,
            action="Action Item & Assignment Evaluation",
            status="completed",
            input_summary=f"{len(raw_items)} items evaluated",
            output_summary=f"Created {persisted_tasks_count} active tasks, {review_items_count} queued for human review",
            start_time=start_time
        )

        return {
            "persisted_tasks_count": persisted_tasks_count,
            "review_items_count": review_items_count,
            "evaluated_items": evaluated_items,
            "status": "processing"
        }

assignment_agent = AssignmentAgent()
