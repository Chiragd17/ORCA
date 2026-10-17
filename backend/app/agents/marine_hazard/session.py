import asyncio
import uuid
from datetime import UTC, datetime
from typing import Any

from app.schemas.evidence import EvidenceRecord, Finding
from app.schemas.investigation import LocationContext


class ConversationSession:
    """Represents a multi-turn marine hazard agent conversation state."""

    def __init__(
        self,
        conversation_id: str,
        location: LocationContext | None = None,
    ):
        self.conversation_id = conversation_id
        self.created_at = datetime.now(UTC)
        self.updated_at = datetime.now(UTC)
        self.location = location
        self.messages: list[dict[str, Any]] = []
        self.evidence_pool: dict[str, EvidenceRecord] = {}
        self.findings_pool: dict[str, Finding] = {}
        self.limitations: list[str] = [
            "Official localized storm warning signals (1-11) must be verified directly with national authorities (IMD/JTWC).",
            "Historical cyclone tracks represent retrospective benchmarks, not operational forecasts of future events.",
            "Positional track uncertainty is ±15 to 30 km for historical best-track observations.",
        ]
        self.tool_executions: list[dict[str, Any]] = []

    def touch(self) -> None:
        self.updated_at = datetime.now(UTC)

    def update_location(self, new_location: LocationContext | None) -> bool:
        """
        Update the active geographic anchor. If the location changed (different name
        or coordinates shifted > 0.15 deg), clears the active evidence and findings pools
        to prevent cross-contamination between locations (e.g. Mangaluru vs Chennai).
        """
        if new_location is None:
            return False

        changed = False
        if self.location is None:
            self.location = new_location
            changed = True
        else:
            name_changed = bool(
                new_location.name
                and self.location.name
                and new_location.name.lower().strip() != self.location.name.lower().strip()
            )
            coords_changed = bool(
                new_location.latitude is not None
                and self.location.latitude is not None
                and (
                    abs(new_location.latitude - self.location.latitude) > 0.15
                    or (
                        new_location.longitude is not None
                        and self.location.longitude is not None
                        and abs(new_location.longitude - self.location.longitude) > 0.15
                    )
                )
            )
            if name_changed or coords_changed:
                self.location = new_location
                self.evidence_pool.clear()
                self.findings_pool.clear()
                changed = True

        self.touch()
        return changed

    def add_user_message(self, content: str) -> None:

        self.messages.append(
            {
                "role": "user",
                "content": content,
                "timestamp": datetime.now(UTC).isoformat(),
            }
        )
        self.touch()

    def add_assistant_message(
        self,
        content: str,
        tool_calls: list[Any] | None = None,
        evidence_ids: list[str] | None = None,
        provider: str = "unknown",
        model: str = "unknown",
    ) -> None:
        msg: dict[str, Any] = {
            "role": "assistant",
            "content": content,
            "timestamp": datetime.now(UTC).isoformat(),
            "evidence_ids": evidence_ids or [],
            "provider": provider,
            "model": model,
        }
        if tool_calls:
            msg["tool_calls"] = [
                {
                    "id": tc.id if hasattr(tc, "id") else tc.get("id"),
                    "type": "function",
                    "function": {
                        "name": tc.name if hasattr(tc, "name") else tc.get("name"),
                        "arguments": tc.arguments
                        if hasattr(tc, "arguments")
                        else tc.get("arguments", {}),
                    },
                }
                for tc in tool_calls
            ]
        self.messages.append(msg)
        self.touch()

    def add_tool_message(
        self, tool_call_id: str, tool_name: str, content: str
    ) -> None:
        self.messages.append(
            {
                "role": "tool",
                "tool_call_id": tool_call_id,
                "name": tool_name,
                "content": content,
                "timestamp": datetime.now(UTC).isoformat(),
            }
        )
        self.touch()

    def add_evidence(self, records: list[EvidenceRecord]) -> None:
        for r in records:
            self.evidence_pool[r.id] = r
        self.touch()

    def add_findings(self, findings: list[Finding]) -> None:
        for f in findings:
            self.findings_pool[f.id] = f
        self.touch()


class ConversationSessionManager:
    """Thread-safe in-memory manager for active marine hazard chat sessions."""

    def __init__(self, max_sessions: int = 1000):
        self._sessions: dict[str, ConversationSession] = {}
        self._max_sessions = max_sessions
        self._lock = asyncio.Lock()

    async def get_or_create(
        self,
        conversation_id: str | None = None,
        location: LocationContext | None = None,
    ) -> ConversationSession:
        async with self._lock:
            cid = conversation_id or f"conv-hz-{uuid.uuid4().hex[:8]}"
            if cid not in self._sessions:
                # Evict oldest session if at capacity
                if len(self._sessions) >= self._max_sessions:
                    oldest_id = min(
                        self._sessions.keys(),
                        key=lambda k: self._sessions[k].updated_at,
                    )
                    self._sessions.pop(oldest_id, None)

                self._sessions[cid] = ConversationSession(
                    conversation_id=cid, location=location
                )
            else:
                session = self._sessions[cid]
                if location is not None:
                    session.update_location(location)
                session.touch()

            return self._sessions[cid]

    async def get(self, conversation_id: str) -> ConversationSession | None:
        async with self._lock:
            return self._sessions.get(conversation_id)

    async def clear(self, conversation_id: str) -> bool:
        async with self._lock:
            if conversation_id in self._sessions:
                del self._sessions[conversation_id]
                return True
            return False


# Global singleton session manager
session_manager = ConversationSessionManager()
