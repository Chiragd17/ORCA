from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class LLMMessage(BaseModel):
    role: str = Field(..., description="Role: system, user, assistant")
    content: str = Field(..., description="Message text content")


class LLMResponse(BaseModel):
    content: str = Field(..., description="LLM generated content")
    provider: str = Field(..., description="Provider name: groq, gemini, openrouter")
    model: str = Field(..., description="Model name used")
    tokens_used: Optional[int] = Field(None, description="Total tokens consumed")
    metadata: Dict[str, Any] = Field(default_factory=dict)


class BaseLLMProvider(ABC):
    """Abstract base class for all ORCA LLM providers."""
    provider_name: str

    @abstractmethod
    async def generate(
        self,
        messages: List[LLMMessage],
        temperature: float = 0.2,
        max_tokens: int = 2048,
        **kwargs
    ) -> LLMResponse:
        """Generate a response using this provider."""
        pass
