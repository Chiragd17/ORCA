from abc import ABC, abstractmethod
from typing import Any


class LLMToolCall:
    def __init__(self, id: str, name: str, arguments: dict[str, Any]):
        self.id = id
        self.name = name
        self.arguments = arguments


class LLMResponse:
    def __init__(
        self,
        content: str | None = None,
        tool_calls: list[LLMToolCall] | None = None,
        provider: str = "unknown",
        model: str = "unknown",
    ):
        self.content = content or ""
        self.tool_calls = tool_calls or []
        self.provider = provider
        self.model = model


class LLMProvider(ABC):
    """Abstract interface for LLM integrations with fallback capability."""

    name: str

    @abstractmethod
    async def is_configured(self) -> bool:
        """Check if provider credentials are set."""

    @abstractmethod
    async def generate_response(
        self, prompt: str, system_prompt: str | None = None, temperature: float = 0.1
    ) -> str:
        """Generate a completion response from the model."""

    async def chat_with_tools(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
        temperature: float = 0.1,
    ) -> LLMResponse:
        """Execute a chat completion turn with optional tool calling."""
        last_user_msg = next(
            (m["content"] for m in reversed(messages) if m.get("role") == "user"), ""
        )
        sys_msg = next(
            (m["content"] for m in messages if m.get("role") == "system"), None
        )
        text = await self.generate_response(
            last_user_msg, system_prompt=sys_msg, temperature=temperature
        )
        return LLMResponse(content=text, provider=self.name)

