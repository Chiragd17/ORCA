from enum import Enum
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class ExecutionEventType(str, Enum):
    INVESTIGATION_STARTED = "investigation_started"
    AGENT_STARTED = "agent_started"
    TOOL_COMPLETED = "tool_completed"
    EVIDENCE_ADDED = "evidence_added"
    AGENT_COMPLETED = "agent_completed"
    VERIFICATION_FAILED = "verification_failed"
    VERIFICATION_PASSED = "verification_passed"
    INVESTIGATION_COMPLETED = "investigation_completed"


class ExecutionEvent(BaseModel):
    event_id: Optional[str] = None
    investigation_id: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    event_type: ExecutionEventType
    agent_id: Optional[str] = None
    details: Dict[str, Any] = Field(default_factory=dict)
