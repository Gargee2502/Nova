import logging
from typing import TypedDict, List, Dict, Any, Optional
from langgraph.graph import StateGraph, END

from backend.agents.agent1 import supervisor_agent
from backend.agents.agent2 import meeting_extraction_agent
from backend.agents.agent3 import assignment_agent
from backend.config import settings

logger = logging.getLogger("nova.agents.workflow")

class AgentState(TypedDict, total=False):
    meeting_id: str
    meeting_title: str
    file_path: Optional[str]
    transcript: Optional[str]
    participants: List[str]
    owner_name: Optional[str]
    confidence_threshold: float
    supervisor_decision: str
    planned_steps: List[str]
    summary: str
    key_points: List[str]
    decisions: List[str]
    raw_action_items: List[Dict[str, Any]]
    persisted_tasks_count: int
    review_items_count: int
    evaluated_items: List[Dict[str, Any]]
    errors: List[str]
    status: str
    final_summary: str

# Node Functions

def supervisor_planning_node(state: AgentState) -> Dict[str, Any]:
    """Node 1: Supervisor reviews input and determines planning steps."""
    logger.info(f"Running supervisor planning for meeting: {state.get('meeting_id')}")
    plan_result = supervisor_agent.plan_workflow(dict(state))
    return plan_result

def extraction_node(state: AgentState) -> Dict[str, Any]:
    """Node 2: Extraction Agent extracts transcript insights and action items."""
    logger.info(f"Running extraction agent for meeting: {state.get('meeting_id')}")
    extract_result = meeting_extraction_agent.extract(dict(state))
    return extract_result

def assignment_node(state: AgentState) -> Dict[str, Any]:
    """Node 3: Assignment Agent matches assignees and routes by confidence threshold."""
    logger.info(f"Running assignment agent for meeting: {state.get('meeting_id')}")
    assign_result = assignment_agent.process_assignments(dict(state))
    return assign_result

def error_recovery_node(state: AgentState) -> Dict[str, Any]:
    """Node 4: Error recovery node to handle failures gracefully without crashing."""
    logger.warning(f"Workflow entered error recovery for meeting: {state.get('meeting_id')}")
    errors = state.get("errors", ["Unknown processing error"])
    return {
        "status": "failed",
        "errors": errors
    }

def finalize_node(state: AgentState) -> Dict[str, Any]:
    """Node 5: Supervisor summarizes execution and updates database."""
    logger.info(f"Running supervisor finalize for meeting: {state.get('meeting_id')}")
    final_res = supervisor_agent.finalize_workflow(dict(state))
    return final_res

# Conditional Router Functions

def route_after_supervisor(state: AgentState) -> str:
    if state.get("supervisor_decision") == "abort" or state.get("status") == "failed":
        return "error_recovery"
    return "extraction"

def route_after_extraction(state: AgentState) -> str:
    if state.get("status") == "failed" or bool(state.get("errors")):
        return "error_recovery"
    return "assignment"

# LangGraph Build

def create_agent_workflow() -> Any:
    workflow = StateGraph(AgentState)

    # Register Nodes
    workflow.add_node("supervisor_planning", supervisor_planning_node)
    workflow.add_node("extraction", extraction_node)
    workflow.add_node("assignment", assignment_node)
    workflow.add_node("error_recovery", error_recovery_node)
    workflow.add_node("finalize", finalize_node)

    # Set Entry Point
    workflow.set_entry_point("supervisor_planning")

    # Add Conditional Edges
    workflow.add_conditional_edges(
        "supervisor_planning",
        route_after_supervisor,
        {
            "extraction": "extraction",
            "error_recovery": "error_recovery"
        }
    )

    workflow.add_conditional_edges(
        "extraction",
        route_after_extraction,
        {
            "assignment": "assignment",
            "error_recovery": "error_recovery"
        }
    )

    workflow.add_edge("assignment", "finalize")
    workflow.add_edge("error_recovery", "finalize")
    workflow.add_edge("finalize", END)

    return workflow.compile()

# Singleton compiled workflow
compiled_agent_workflow = create_agent_workflow()

def run_meeting_pipeline(
    meeting_id: str,
    meeting_title: str,
    file_path: Optional[str] = None,
    transcript: Optional[str] = None,
    participants: Optional[List[str]] = None,
    owner_name: Optional[str] = None,
    confidence_threshold: Optional[float] = None
) -> Dict[str, Any]:
    """
    Execute the compiled LangGraph multi-agent pipeline for a meeting.
    """
    initial_state: AgentState = {
        "meeting_id": meeting_id,
        "meeting_title": meeting_title,
        "file_path": file_path,
        "transcript": transcript or "",
        "participants": participants or [],
        "owner_name": owner_name,
        "confidence_threshold": confidence_threshold or settings.CONFIDENCE_THRESHOLD,
        "supervisor_decision": "pending",
        "planned_steps": [],
        "summary": "",
        "key_points": [],
        "decisions": [],
        "raw_action_items": [],
        "persisted_tasks_count": 0,
        "review_items_count": 0,
        "evaluated_items": [],
        "errors": [],
        "status": "started",
        "final_summary": ""
    }

    result = compiled_agent_workflow.invoke(initial_state)
    return result
