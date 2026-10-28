import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from backend.services.gemini_service import gemini_service
from backend.database import db

logger = logging.getLogger("nova.agents.followup")

class FollowUpAgent:
    """
    Follow-Up Agent (Agent 4)
    - Identifies pending tasks approaching due dates or needing reminders.
    - Checks task status (skips completed/cancelled tasks).
    - Prepares contextual reminder messages via Gemini.
    - Dispatches in-app notifications and task activity records.
    - Prevents duplicate reminders.
    - Records reminder attempts and outcomes.
    """
    def __init__(self):
        self.name = "Follow-Up Agent"

    def record_activity(
        self,
        meeting_id: Optional[str],
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

    def trigger_reminder_for_task(self, task_id: str, recipient_email: Optional[str] = None) -> Dict[str, Any]:
        """
        Manually or autonomously trigger a reminder for a specific task.
        """
        start_time = datetime.now(timezone.utc).isoformat()
        task = db.find_one("tasks", {"id": task_id})
        if not task:
            return {"success": False, "message": "Task not found."}

        # Check if task is already completed
        if task.get("status") in ("completed", "cancelled"):
            return {
                "success": False,
                "message": f"Task '{task.get('title')}' is already {task.get('status')}. Reminder skipped."
            }

        meeting_id = task.get("meeting_id")
        meeting = db.find_one("meetings", {"id": meeting_id}) or {}
        meeting_title = meeting.get("title", "Meeting")

        assignee = task.get("assignee") or "Team Member"
        due_date = task.get("due_date")
        title = task.get("title")

        # Generate intelligent reminder message
        msg_data = gemini_service.generate_reminder_message(
            task_title=title,
            assignee=assignee,
            due_date=due_date,
            meeting_title=meeting_title,
            days_remaining_or_overdue="Action required"
        )

        subject = msg_data.get("subject", f"Reminder: {title}")
        body = msg_data.get("body", f"Follow up on task: {title}")

        # Record in-app reminder event
        now = datetime.now(timezone.utc).isoformat()
        reminder_record = {
            "task_id": task_id,
            "meeting_id": meeting_id,
            "assignee": assignee,
            "subject": subject,
            "body": body,
            "sent_at": now,
            "status": "recorded"
        }
        db.insert("reminders", reminder_record)

        # Update task reminder count
        current_reminders = task.get("reminders_sent", 0) + 1
        db.update("tasks", {"id": task_id}, {
            "reminders_sent": current_reminders,
            "last_reminded_at": now
        })

        self.record_activity(
            meeting_id=meeting_id,
            action="Follow-Up Reminder Dispatched",
            status="completed",
            input_summary=f"Task: {title} | Assignee: {assignee}",
            output_summary=f"In-app reminder #{current_reminders} dispatched for {assignee}",
            start_time=start_time
        )

        return {
            "success": True,
            "task_id": task_id,
            "reminders_sent": current_reminders,
            "subject": subject,
            "body": body,
            "assignee": assignee
        }

    def check_and_send_scheduled_reminders(self) -> List[Dict[str, Any]]:
        """
        Scheduled check: scans for pending tasks and sends reminders if needed.
        """
        pending_tasks = db.find_many("tasks", {"status": "pending"})
        results = []
        for task in pending_tasks:
            # Check last reminded timestamp to avoid spam (at least 6 hours apart)
            last_reminded = task.get("last_reminded_at")
            if last_reminded:
                try:
                    last_dt = datetime.fromisoformat(last_reminded.replace("Z", "+00:00"))
                    if datetime.now(timezone.utc) - last_dt < timedelta(hours=6):
                        continue
                except Exception:
                    pass

            res = self.trigger_reminder_for_task(task["id"])
            results.append(res)
        return results

followup_agent = FollowUpAgent()
