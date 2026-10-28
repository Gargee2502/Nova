import os
import pytest
from backend.config import settings
from backend.services.gemini_service import gemini_service

@pytest.mark.skipif(
    not settings.is_gemini_configured or not os.getenv("RUN_LIVE_GEMINI_TEST"),
    reason="Live Gemini integration test skipped. To run against live Google AI Studio API, set RUN_LIVE_GEMINI_TEST=1."
)
def test_live_gemini_connection():
    """
    Live integration test that connects to Google Gemini API only when explicitly requested
    and when GEMINI_API_KEY is configured in .env.
    """
    assert gemini_service.is_ready()
    test_transcript = (
        "Alice: Let's finalize the sprint goals. Bob, please prepare the release notes by Friday."
    )
    insights = gemini_service.extract_meeting_insights(
        transcript=test_transcript,
        meeting_title="Sprint Planning",
        participants=["Alice", "Bob"]
    )
    assert "summary" in insights
    assert "raw_action_items" in insights
    assert len(insights["raw_action_items"]) >= 1
