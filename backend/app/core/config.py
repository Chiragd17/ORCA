import os
from typing import List, Union, Optional
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # App
    PROJECT_NAME: str = "ORCA — Marine & Coastal Intelligence Platform"
    VERSION: str = "0.1.0"
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, list):
            return v
        return ["*"]

    # Database
    DATABASE_URL: str = "postgresql+psycopg://orca_user:orca_password@localhost:5432/orca_db"
    # pyrefly: ignore[unknown-name]
    HAZARD_DATABASE_URL: Optional[str] = None
    DB_ECHO: bool = False

    # LLM Providers
    GROQ_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    OPENROUTER_API_KEY: str = ""
    DEFAULT_LLM_PROVIDER: str = "groq"

    # Default LLM Models & Settings
    GROQ_MODEL: str = "openai/gpt-oss-120b"
    GROQ_FALLBACK_MODEL: str = "qwen/qwen3.8-27b"
    GEMINI_MODEL: str = "gemini-flash-latest"
    OPENROUTER_MODEL: str = "anthropic/claude-3.5-sonnet"
    LLM_TEMPERATURE: float = 0.1
    LLM_TIMEOUT_SECONDS: int = 30

    # External Provider Defaults & Timeouts
    OPEN_METEO_BASE_URL: str = "https://marine-api.open-meteo.com/v1/marine"
    GDACS_FEED_URL: str = "https://www.gdacs.org/xml/rss.xml"
    EXTERNAL_REQUEST_TIMEOUT_SECONDS: int = 20
    DATA_DIR: str = "data"

    # Provider Freshness Thresholds (Hours)
    GDACS_FRESHNESS_HOURS: int = 6
    OPEN_METEO_FRESHNESS_HOURS: int = 12
    NOAA_NHC_FRESHNESS_HOURS: int = 6

    # Provider Retry & Resilience Parameters
    MAX_PROVIDER_RETRIES: int = 2
    RETRY_BASE_DELAY_SECONDS: float = 0.5
    MAX_RETRY_DELAY_SECONDS: float = 5.0

    _backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    _project_dir = os.path.dirname(_backend_dir)

    model_config = SettingsConfigDict(
        env_file=(
            os.path.join(_project_dir, ".env"),
            os.path.join(_backend_dir, ".env"),
            ".env",
        ),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
