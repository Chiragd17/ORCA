from app.providers.llm_tools.base import LLMProvider
from app.providers.llm_tools.gemini import GeminiProvider
from app.providers.llm_tools.groq import GroqProvider
from app.providers.llm_tools.openrouter import OpenRouterProvider

_providers: list[LLMProvider] = [
    GroqProvider(),
    GeminiProvider(),
    OpenRouterProvider(),
]


async def get_active_llm_provider() -> LLMProvider | None:
    """
    Returns the first configured LLM provider according to priority:
    1. Groq
    2. Gemini
    3. OpenRouter
    Returns None if no keys are configured.
    """
    for provider in _providers:
        if await provider.is_configured():
            return provider
    return None


async def get_ordered_llm_providers() -> list[LLMProvider]:
    """
    Returns all configured LLM providers in priority order:
    1. Groq
    2. Gemini
    3. OpenRouter
    """
    configured = []
    for provider in _providers:
        if await provider.is_configured():
            configured.append(provider)
    return configured


__all__ = [
    "GeminiProvider",
    "GroqProvider",
    "LLMProvider",
    "OpenRouterProvider",
    "get_active_llm_provider",
    "get_ordered_llm_providers",
]
