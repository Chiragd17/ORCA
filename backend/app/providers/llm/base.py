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
    provider_name: str = "base"
    name: str = "base"

    async def generate(
        self,
        messages: List[LLMMessage],
        temperature: float = 0.2,
        max_tokens: int = 2048,
        **kwargs
    ) -> LLMResponse:
        """Generate a response using this provider."""
        prompt = "\n".join(m.content for m in messages if m.role == "user")
        sys_inst = next((m.content for m in messages if m.role == "system"), None)
        text = await self.generate_text(prompt=prompt, system_instruction=sys_inst, temperature=temperature)
        return LLMResponse(content=text, provider=getattr(self, "provider_name", "base"), model="default")

    async def generate_text(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        temperature: float = 0.2,
    ) -> str:
        """Generate response text for the given prompt."""
        msgs = []
        if system_instruction:
            msgs.append(LLMMessage(role="system", content=system_instruction))
        msgs.append(LLMMessage(role="user", content=prompt))
        resp = await self.generate(messages=msgs, temperature=temperature)
        return resp.content
