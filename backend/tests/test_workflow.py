import pytest
from unittest.mock import patch
from backend.agents.agent_workflow import run_meeting_pipeline
from backend.database import db

def test_workflow_execution_with_transcript():
    """
    Test the multi-agent workflow when a transcript is present.
    Mocks Gemini external calls to ensure zero quota consumption in automated unit tests.
    """
    meeting = db.insert("meetings", {
        "title": "RM Springfield Council Meeting",
        "owner_name": "Mayor",
        "participants": ["Doug Shaver", "Melinda Warren", "Glenn Fuel", "Tristan Vantage"],
        "status": "uploaded",
        "file_size": 1024
    })
    meeting_id = meeting["id"]

    sample_transcript = (
        "The council convened to approve the agenda and minutes. "
        "Doug Shaver was appointed as Board Chair for 2027. "
        "Tristan Vantage to provide a soccer ball signed by the team as a condition for the championships. "
        "Meeting adjourned at 7:15 PM."
    )

    mocked_insights = {
        "summary": "The council convened to approve minutes and appoint board members.",
        "key_points": ["Board appointment", "Soccer sponsorship"],
        "decisions": ["Agenda approved unanimously", "Board of Revision scheduled for Nov 12, 2026"],
        "raw_action_items": [
            {
                "title": "Provide a soccer ball signed by the team",
                "evidence": "Tristan Vantage to provide a soccer ball signed by the team as a condition for the championships.",
                "suggested_owner": "Tristan Vantage",
                "suggested_deadline": "2026-11-12",
                "priority": "medium"
            },
            {
                "title": "Check regional recyclers forum agenda",
                "evidence": "Someone should look into the recyclers forum.",
                "suggested_owner": None,
                "suggested_deadline": None,
                "priority": "low"
            }
        ]
    }

    mock_assignment_high_conf = {
        "assignee": "Tristan Vantage",
        "due_date": "2026-11-12",
        "priority": "medium",
        "confidence": 0.88,
        "confidence_reason": "Direct assignment to Tristan Vantage in transcript",
        "is_explicit_assignment": True,
        "requires_human_review": False
    }

    mock_assignment_low_conf = {
        "assignee": None,
        "due_date": None,
        "priority": "low",
        "confidence": 0.45,
        "confidence_reason": "No owner specified in transcript",
        "is_explicit_assignment": False,
        "requires_human_review": True
    }

    def mock_analyze(action_item_title, **kwargs):
        if "soccer ball" in action_item_title:
            return mock_assignment_high_conf
        return mock_assignment_low_conf

    with patch("backend.services.gemini_service.gemini_service.extract_meeting_insights", return_value=mocked_insights), \
         patch("backend.services.gemini_service.gemini_service.analyze_assignment", side_effect=mock_analyze):

        pipeline_result = run_meeting_pipeline(
            meeting_id=meeting_id,
            meeting_title="RM Springfield Council Meeting",
            transcript=sample_transcript,
            participants=["Doug Shaver", "Melinda Warren", "Glenn Fuel", "Tristan Vantage"],
            owner_name="Mayor",
            confidence_threshold=0.70
        )

        assert pipeline_result["status"] == "completed"
        assert pipeline_result["persisted_tasks_count"] == 1
        assert pipeline_result["review_items_count"] == 1

        # Check that high-confidence item is in tasks collection
        tasks = db.find_many("tasks", {"meeting_id": meeting_id})
        assert len(tasks) == 1
        assert tasks[0]["assignee"] == "Tristan Vantage"
        assert tasks[0]["confidence"] >= 0.70

        # Check that low-confidence item was routed to reviews collection
        reviews = db.find_many("reviews", {"meeting_id": meeting_id})
        assert len(reviews) == 1
        assert reviews[0]["confidence"] < 0.70
        assert "recyclers" in reviews[0]["suggested_title"].lower()

def test_workflow_error_handling_when_no_content():
    """
    Test that supervisor aborts and routes to error recovery when neither transcript nor media exists.
    """
    pipeline_result = run_meeting_pipeline(
        meeting_id="empty-meeting-id",
        meeting_title="Empty Meeting",
        file_path=None,
        transcript=None
    )
    assert pipeline_result["status"] == "failed"
    assert len(pipeline_result["errors"]) > 0
