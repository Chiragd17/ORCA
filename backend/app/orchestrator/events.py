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
    id: Optional[str] = None
    investigation_id: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    event_type: ExecutionEventType
    agent_id: Optional[str] = None
    details: Dict[str, Any] = Field(default_factory=dict)


EventType = ExecutionEventType


class EventBus:
    """
    Manages and stores execution events emitted during an investigation.
    """
    def __init__(self, investigation_id: str):
        self.investigation_id = investigation_id
        self._events: list = []

    def emit(
        self,
        event_type: Any,
        agent_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ) -> ExecutionEvent:
        import uuid
        ev_id = f"evt-{uuid.uuid4().hex[:12]}"
        ev_type = event_type if isinstance(event_type, ExecutionEventType) else ExecutionEventType(str(event_type.value if hasattr(event_type, "value") else event_type))
        event = ExecutionEvent(
            event_id=ev_id,
            id=ev_id,
            investigation_id=self.investigation_id,
            event_type=ev_type,
            agent_id=agent_id,
            timestamp=datetime.now(timezone.utc),
            details=details or {},
        )
        self._events.append(event)
        return event

    def get_events(self) -> list:
        return list(self._events)
