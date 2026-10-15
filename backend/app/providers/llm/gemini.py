from typing import List
from app.providers.llm.base import BaseLLMProvider, LLMMessage, LLMResponse
from app.core.config import settings
from app.core.exceptions import ProviderUnavailableException


class GeminiProvider(BaseLLMProvider):
    provider_name = "gemini"

    def __init__(self, api_key: str | None = None, model: str | None = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model = model or settings.GEMINI_MODEL

    async def generate(
        self,
        messages: List[LLMMessage],
        temperature: float = 0.2,
        max_tokens: int = 2048,
        **kwargs
    ) -> LLMResponse:
        if not self.api_key:
            raise ProviderUnavailableException("GEMINI_API_KEY is not configured.")

        from google import genai
        client = genai.Client(api_key=self.api_key)

        prompt = "\n\n".join([f"{m.role.upper()}: {m.content}" for m in messages])
        response = await client.aio.models.generate_content(
            model=self.model,
            contents=prompt,
        )

        return LLMResponse(
            content=response.text or "",
            provider=self.provider_name,
            model=self.model,
        )
