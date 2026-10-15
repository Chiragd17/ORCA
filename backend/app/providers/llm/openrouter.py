from typing import List
import httpx
from app.providers.llm.base import BaseLLMProvider, LLMMessage, LLMResponse
from app.core.config import settings
from app.core.exceptions import ProviderUnavailableException


class OpenRouterProvider(BaseLLMProvider):
    provider_name = "openrouter"

    def __init__(self, api_key: str | None = None, model: str | None = None):
        self.api_key = api_key or settings.OPENROUTER_API_KEY
        self.model = model or settings.OPENROUTER_MODEL

    async def generate(
        self,
        messages: List[LLMMessage],
        temperature: float = 0.2,
        max_tokens: int = 2048,
        **kwargs
    ) -> LLMResponse:
        if not self.api_key:
            raise ProviderUnavailableException("OPENROUTER_API_KEY is not configured.")

        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "HTTP-Referer": "https://github.com/orca-marine/orca",
            "X-Title": "ORCA Marine Intelligence",
        }
        payload = {
            "model": self.model,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            if resp.status_code != 200:
                raise ProviderUnavailableException(f"OpenRouter returned status {resp.status_code}: {resp.text}")

            data = resp.json()
            choice = data["choices"][0]
            return LLMResponse(
                content=choice["message"]["content"] or "",
                provider=self.provider_name,
                model=self.model,
                tokens_used=data.get("usage", {}).get("total_tokens"),
            )
