from typing import List
from app.providers.llm.base import BaseLLMProvider, LLMMessage, LLMResponse
from app.core.config import settings
from app.core.exceptions import ProviderUnavailableException


class GroqProvider(BaseLLMProvider):
    provider_name = "groq"

    def __init__(self, api_key: str | None = None, model: str | None = None):
        self.api_key = api_key or settings.GROQ_API_KEY
        self.model = model or settings.GROQ_MODEL

    async def generate(
        self,
        messages: List[LLMMessage],
        temperature: float = 0.2,
        max_tokens: int = 2048,
        **kwargs
    ) -> LLMResponse:
        if not self.api_key:
            raise ProviderUnavailableException("GROQ_API_KEY is not configured.")

        from groq import AsyncGroq
        client = AsyncGroq(api_key=self.api_key)
        formatted = [{"role": m.role, "content": m.content} for m in messages]

        resp = await client.chat.completions.create(
            model=self.model,
            messages=formatted,
            temperature=temperature,
            max_tokens=max_tokens,
        )

        choice = resp.choices[0]
        return LLMResponse(
            content=choice.message.content or "",
            provider=self.provider_name,
            model=self.model,
            tokens_used=resp.usage.total_tokens if resp.usage else None,
        )
