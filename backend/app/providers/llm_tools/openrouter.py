import json
from typing import Any

import httpx
from app.core.config import settings
from app.providers.llm_tools.base import LLMProvider, LLMResponse, LLMToolCall


class OpenRouterProvider(LLMProvider):
    name: str = "openrouter"
    model: str = "meta-llama/llama-3.3-70b-instruct"

    async def is_configured(self) -> bool:
        return bool(settings.OPENROUTER_API_KEY and settings.OPENROUTER_API_KEY.strip())

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
            raise ValueError("OpenRouter API key is not configured.")

        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/orca-ocean/orca",
            "X-Title": "ORCA Marine Intelligence",
        }

        payload: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
        }
        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"

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

            return LLMResponse(
                content=content,
                tool_calls=parsed_tool_calls,
                provider=self.name,
                model=self.model,
            )

