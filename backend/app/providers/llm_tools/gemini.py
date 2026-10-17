from typing import Any

import httpx
from app.core.config import settings
from app.providers.llm_tools.base import LLMProvider, LLMResponse


class GeminiProvider(LLMProvider):
    name: str = "gemini"

    def __init__(self, model: str | None = None) -> None:
        self.model = model or getattr(settings, "GEMINI_MODEL", "gemini-flash-latest")

    async def is_configured(self) -> bool:
        return bool(settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip())

    async def generate_response(
        self, prompt: str, system_prompt: str | None = None, temperature: float = 0.1
    ) -> str:
        if not await self.is_configured():
            raise ValueError("Gemini API key is not configured.")

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={settings.GEMINI_API_KEY}"

        contents = []
        if system_prompt:
            contents.append(
                {
                    "role": "user",
                    "parts": [{"text": f"System Instruction: {system_prompt}"}],
                }
            )
            contents.append({"role": "model", "parts": [{"text": "Understood."}]})
        contents.append({"role": "user", "parts": [{"text": prompt}]})

        payload = {
            "contents": contents,
            "generationConfig": {"temperature": temperature},
        }

        async with httpx.AsyncClient(timeout=settings.LLM_TIMEOUT_SECONDS) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
            candidates = data.get("candidates", [])
            reply_text = ""
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                for p in parts:
                    if isinstance(p, dict) and "text" in p:
                        reply_text += p["text"]
            return reply_text

    async def chat_with_tools(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
        temperature: float = 0.1,
    ) -> LLMResponse:
        """
        Chat completion using Gemini generateContent.
        """
        if not await self.is_configured():
            raise ValueError("Gemini API key is not configured.")

        # Convert OpenAI-style messages to Gemini contents format
        contents = []
        system_instruction = None
        for m in messages:
            role = m.get("role")
            content = m.get("content") or ""
            if role == "system":
                system_instruction = content
            elif role == "user":
                contents.append({"role": "user", "parts": [{"text": content}]})
            elif role == "assistant":
                contents.append({"role": "model", "parts": [{"text": content}]})
            elif role == "tool":
                # Feed tool result as user context
                contents.append({
                    "role": "user",
                    "parts": [{"text": f"Tool Execution Result ({m.get('name', 'tool')}): {content}"}]
                })

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={settings.GEMINI_API_KEY}"
        payload: dict[str, Any] = {
            "contents": contents,
            "generationConfig": {"temperature": temperature},
        }
        if system_instruction:
            payload["systemInstruction"] = {"parts": [{"text": system_instruction}]}

        async with httpx.AsyncClient(timeout=settings.LLM_TIMEOUT_SECONDS) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
            candidates = data.get("candidates", [])
            reply_text = ""
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                for p in parts:
                    if isinstance(p, dict) and "text" in p:
                        reply_text += p["text"]
            return LLMResponse(
                content=reply_text,
                tool_calls=[],
                provider=self.name,
                model=self.model,
            )
