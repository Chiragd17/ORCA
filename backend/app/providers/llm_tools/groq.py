import json
from typing import Any

import httpx
from app.core.config import settings
from app.core.logging import logger
from app.providers.llm_tools.base import LLMProvider, LLMResponse, LLMToolCall


class GroqProvider(LLMProvider):
    name: str = "groq"

    def __init__(self, model: str | None = None) -> None:
        self.model = model or getattr(settings, "GROQ_MODEL", "openai/gpt-oss-120b")
        self.fallback_model = getattr(settings, "GROQ_FALLBACK_MODEL", "qwen/qwen3.8-27b")

    async def is_configured(self) -> bool:
        return bool(settings.GROQ_API_KEY and settings.GROQ_API_KEY.strip())

    async def generate_response(
        self, prompt: str, system_prompt: str | None = None, temperature: float = 0.1
    ) -> str:
        messages: list[dict[str, Any]] = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        resp = await self.chat_with_tools(messages=messages, temperature=temperature)
        return resp.content

    async def chat_with_tools(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
        temperature: float = 0.1,
    ) -> LLMResponse:
        if not await self.is_configured():
            raise ValueError("Groq API key is not configured.")

        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.GROQ_API_KEY}",
            "Content-Type": "application/json",
        }

        # Try primary model, fallback to secondary if model not found (404)
        models_to_try = [self.model]
        if self.fallback_model and self.fallback_model != self.model:
            models_to_try.append(self.fallback_model)

        last_error: Exception | None = None
        for current_model in models_to_try:
            payload: dict[str, Any] = {
                "model": current_model,
                "messages": messages,
                "temperature": temperature,
            }
            if tools:
                payload["tools"] = tools
                payload["tool_choice"] = "auto"

            try:
                async with httpx.AsyncClient(timeout=settings.LLM_TIMEOUT_SECONDS) as client:
                    response = await client.post(url, headers=headers, json=payload)
                    response.raise_for_status()
                    data = response.json()
                    choice = data["choices"][0]["message"]
                    content = choice.get("content") or ""
                    raw_tool_calls = choice.get("tool_calls") or []

                    parsed_tool_calls: list[LLMToolCall] = []
                    for tc in raw_tool_calls:
                        func = tc.get("function", {})
                        args = func.get("arguments", "{}")
                        if isinstance(args, str):
                            try:
                                parsed_args = json.loads(args)
                            except Exception:  # noqa: BLE001
                                parsed_args = {}
                        else:
                            parsed_args = args
                        parsed_tool_calls.append(
                            LLMToolCall(
                                id=tc.get("id", f"call-{func.get('name')}"),
                                name=func.get("name", ""),
                                arguments=parsed_args,
                            )
                        )

                    self.model = current_model
                    return LLMResponse(
                        content=content,
                        tool_calls=parsed_tool_calls,
                        provider=self.name,
                        model=current_model,
                    )
            except httpx.HTTPStatusError as e:
                last_error = e
                if e.response.status_code == 404 and current_model != models_to_try[-1]:
                    logger.warning(
                        f"Groq model '{current_model}' returned 404 (not found). "
                        f"Retrying with fallback model '{self.fallback_model}'..."
                    )
                    continue
                raise
            except Exception as e:
                last_error = e
                raise

        if last_error:
            raise last_error
        raise RuntimeError("No Groq model could be reached.")

