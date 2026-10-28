import json
import logging
import time
from pathlib import Path
from typing import Any, Dict, List, Optional
from google import genai
from google.genai import types
from google.genai.errors import APIError

from backend.config import settings

logger = logging.getLogger("nova.gemini")

class GeminiService:
    def __init__(self):
        self._client: Optional[genai.Client] = None
        self._model = settings.GEMINI_MODEL
        self._init_client()

    def _init_client(self):
        if settings.is_gemini_configured:
            try:
                self._client = genai.Client(api_key=settings.GEMINI_API_KEY)
                logger.info(f"Gemini client initialized with model: {self._model}")
            except Exception as e:
                logger.error(f"Failed to initialize Gemini client: {e}")
                self._client = None
        else:
            self._client = None
            logger.warning("Gemini API key not configured or contains placeholder.")

    def reload_config(self):
        """Reload configuration from environment or settings."""
        self._model = settings.GEMINI_MODEL
        self._init_client()

    def is_ready(self) -> bool:
        return self._client is not None

    def _execute_with_retry(self, fn, max_retries: int = 3, initial_delay: float = 2.0):
        """Execute a function with exponential backoff on transient/429 errors."""
        delay = initial_delay
        last_error = None
        for attempt in range(1, max_retries + 1):
            try:
                return fn()
            except APIError as e:
                last_error = e
                # Check for 429 or quota limit
                if hasattr(e, "code") and e.code == 429:
                    logger.warning(f"Gemini rate limit 429 on attempt {attempt}/{max_retries}. Backing off {delay}s...")
                elif "quota" in str(e).lower() or "resource_exhausted" in str(e).lower():
                    logger.warning(f"Gemini quota exhausted: {e}")
                    raise RuntimeError("Gemini API quota exhausted (HTTP 429). Please check your Google AI Studio free-tier quotas.")
                else:
                    logger.warning(f"Gemini API error on attempt {attempt}: {e}")
                if attempt == max_retries:
                    break
                time.sleep(delay)
                delay *= 2
            except Exception as e:
                last_error = e
                logger.error(f"Unexpected error calling Gemini API: {e}")
                if attempt == max_retries:
                    break
                time.sleep(delay)
                delay *= 2

        raise RuntimeError(f"Gemini API failed after {max_retries} attempts: {last_error}")

    def transcribe_media(self, file_path: Path) -> str:
        """
        Transcribe audio/video file using Gemini's native multimodal capabilities.
        Uploads the file via Gemini Files API and requests a verbatim transcript.
        """
        if not self.is_ready():
            raise RuntimeError("Gemini API is not configured. Please add your GEMINI_API_KEY to the backend .env file.")

        logger.info(f"Transcribing media file: {file_path}")
        
        # Determine mime type
        ext = file_path.suffix.lower()
        mime_map = {
            ".mp3": "audio/mp3",
            ".wav": "audio/wav",
            ".m4a": "audio/m4a",
            ".ogg": "audio/ogg",
            ".mp4": "video/mp4",
            ".webm": "video/webm",
            ".mov": "video/quicktime",
            ".mpeg": "video/mpeg"
        }
        mime_type = mime_map.get(ext, "audio/mp3")

        def _do_transcription():
            # Upload file to Gemini Files API
            uploaded_file = self._client.files.upload(
                file=str(file_path),
                config={"mime_type": mime_type}
            )

            prompt = (
                "Please provide a complete, clean, verbatim transcription of the provided audio/video meeting. "
                "Include speaker labels if discernible, or sequential paragraphs. "
                "Do not summarize or omit sentences. Only return the actual transcript."
            )

            response = self._client.models.generate_content(
                model=self._model,
                contents=[uploaded_file, prompt],
                config=types.GenerateContentConfig(
                    temperature=0.2,
                )
            )

            # Cleanup uploaded file from Gemini storage
            try:
                self._client.files.delete(name=uploaded_file.name)
            except Exception as e:
                logger.debug(f"Could not delete remote temp file: {e}")

            if not response.text:
                raise RuntimeError("Empty transcript received from Gemini model.")
            return response.text.strip()

        return self._execute_with_retry(_do_transcription)

    def extract_meeting_insights(
        self,
        transcript: str,
        meeting_title: Optional[str] = None,
        participants: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Extract summary, key discussion points, and unanimous/majority decisions from the transcript.
        Returns structured JSON validated output.
        """
        if not self.is_ready():
            raise RuntimeError("Gemini API is not configured. Please add your GEMINI_API_KEY to the backend .env file.")

        prompt = f"""
You are the Meeting Extraction Agent for Nova.
Analyze the following meeting transcript and extract structured insights.

Meeting Title: {meeting_title or "Untitled Meeting"}
Known Participants: {', '.join(participants) if participants else "Not provided"}

TRANSCRIPT:
---
{transcript}
---

Return ONLY valid JSON matching this schema:
{{
  "summary": "A concise executive summary paragraph capturing the main purpose and outcomes of the meeting.",
  "key_points": [
    "Key discussion point or topic addressed in the meeting"
  ],
  "decisions": [
    "Explicit decision made or resolution voted upon during the meeting"
  ],
  "raw_action_items": [
    {{
      "title": "Clear action verb describing the task",
      "evidence": "Exact or closely paraphrased quote from transcript showing this item was agreed or stated",
      "suggested_owner": "Name or title of person who should do this, or null if unstated",
      "suggested_deadline": "Stated or implied date/timeframe, or null",
      "priority": "high | medium | low"
    }}
  ]
}}

CRITICAL INSTRUCTIONS:
- Do NOT fabricate facts, decisions, or action items that were not present in the transcript.
- Every action item MUST have verbatim or near-verbatim supporting evidence from the transcript.
- Return ONLY JSON.
"""

        def _do_extraction():
            response = self._client.models.generate_content(
                model=self._model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.2,
                )
            )
            raw_text = response.text.strip()
            # Clean possible markdown fence if model wrapped it
            if raw_text.startswith("```json"):
                raw_text = raw_text[7:]
            if raw_text.startswith("```"):
                raw_text = raw_text[3:]
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3]
            return json.loads(raw_text.strip())

        return self._execute_with_retry(_do_extraction)

    def analyze_assignment(
        self,
        action_item_title: str,
        evidence: str,
        suggested_owner: Optional[str],
        suggested_deadline: Optional[str],
        suggested_priority: str,
        participants: List[str],
        meeting_owner: Optional[str]
    ) -> Dict[str, Any]:
        """
        Evaluate task assignment evidence, match against real participants,
        and assign a confidence score between 0.0 and 1.0.
        """
        if not self.is_ready():
            raise RuntimeError("Gemini API is not configured.")

        prompt = f"""
You are the Assignment Agent for Nova.
Your role is to rigorously evaluate whether the person assigned to a task is clear, supported by direct evidence, or ambiguous.

Task Title: {action_item_title}
Supporting Transcript Evidence: "{evidence}"
Suggested Owner in Meeting: {suggested_owner or "Unknown"}
Known Participant List: {json.dumps(participants)}
Meeting Owner / Uploader: {meeting_owner or "None"}
Deadline stated: {suggested_deadline or "None"}
Priority: {suggested_priority}

Evaluate this assignment and return ONLY valid JSON:
{{
  "assignee": "Best matched full name from participants, or the explicitly stated person. If completely unknown or ambiguous, return null",
  "due_date": "Standardized ISO date or clean text (e.g. 2026-11-12 or Next Friday) or null",
  "priority": "high | medium | low",
  "confidence": 0.85,
  "confidence_reason": "Detailed explanation of why this confidence was given (e.g., 'Explicit commitment by Tristan in transcript', or 'Unclear whether it was assigned to Alice or Bob')",
  "is_explicit_assignment": true,
  "requires_human_review": false
}}

Scoring guidelines:
- If a specific person explicitly volunteered or was directly assigned and accepted in the evidence: confidence >= 0.85.
- If a person's role or title matches someone in the participant list with reasonable certainty: confidence 0.70 - 0.84.
- If it was a passive suggestion ("we should check this"), someone mentioned in passing, or multiple candidates: confidence <= 0.65.
- If confidence < 0.70 or assignee is null/ambiguous, set "requires_human_review": true.
"""

        def _do_assignment():
            response = self._client.models.generate_content(
                model=self._model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.1,
                )
            )
            raw = response.text.strip()
            if raw.startswith("```json"):
                raw = raw[7:]
            if raw.startswith("```"):
                raw = raw[3:]
            if raw.endswith("```"):
                raw = raw[:-3]
            return json.loads(raw.strip())

        return self._execute_with_retry(_do_assignment)

    def generate_reminder_message(
        self,
        task_title: str,
        assignee: str,
        due_date: Optional[str],
        meeting_title: str,
        days_remaining_or_overdue: str
    ) -> Dict[str, str]:
        """
        Draft a polite, professional follow-up reminder email/message.
        """
        if not self.is_ready():
            return {
                "subject": f"Follow-up: {task_title}",
                "body": f"Hi {assignee},\n\nThis is a reminder regarding the action item from '{meeting_title}':\nTask: {task_title}\nDue: {due_date or 'As soon as possible'}\n\nPlease update your progress."
            }

        prompt = f"""
Draft a concise, courteous, professional follow-up reminder message for an action item from a meeting.

Task: {task_title}
Assignee: {assignee}
Due Date: {due_date or "Pending"}
Meeting Source: {meeting_title}
Status: {days_remaining_or_overdue}

Return ONLY valid JSON:
{{
  "subject": "Email subject line",
  "body": "Friendly professional message body"
}}
"""

        try:
            def _do_draft():
                response = self._client.models.generate_content(
                    model=self._model,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.3,
                    )
                )
                raw = response.text.strip()
                if raw.startswith("```json"):
                    raw = raw[7:]
                if raw.startswith("```"):
                    raw = raw[3:]
                if raw.endswith("```"):
                    raw = raw[:-3]
                return json.loads(raw.strip())

            return self._execute_with_retry(_do_draft)
        except Exception:
            return {
                "subject": f"Reminder: {task_title}",
                "body": f"Hello {assignee},\n\nFriendly reminder regarding '{task_title}' from '{meeting_title}'. Due: {due_date or 'Soon'}."
            }

gemini_service = GeminiService()
