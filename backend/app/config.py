import json

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    groq_api_key: str = Field(default="", validation_alias="GROQ_API_KEY")
    groq_model: str = Field(default="llama-3.3-70b-versatile", validation_alias="GROQ_MODEL")
    groq_base_url: str = Field(default="https://api.groq.com/openai/v1", validation_alias="GROQ_BASE_URL")
    hf_embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    chroma_persist_path: str = "./data/chroma"
    chroma_collection: str = "workflow_memory"
    workflow_db_path: str = "./data/workflows.db"
    auto_execute_threshold: float = 0.80
    suggest_only_threshold: float = 0.55
    cors_origins: str = (
        "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001"
    )
    warmup_interval_seconds: int = 300
    enable_periodic_warmup: bool = True

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: object) -> object:
        if isinstance(value, list):
            return ",".join(str(item).strip() for item in value if str(item).strip())

        if isinstance(value, str):
            return value.strip()

        return value

    @property
    def cors_allowed_origins(self) -> list[str]:
        raw_value = self.cors_origins.strip()
        if not raw_value:
            return []

        if raw_value.startswith("["):
            try:
                parsed = json.loads(raw_value)
            except json.JSONDecodeError as exc:
                raise ValueError(
                    "CORS_ORIGINS JSON format is invalid. Use a JSON array or comma-separated values."
                ) from exc

            if not isinstance(parsed, list):
                raise ValueError("CORS_ORIGINS JSON value must be an array of origin strings.")

            origins = [str(item).strip() for item in parsed if str(item).strip()]
        else:
            origins = [item.strip() for item in raw_value.split(",") if item.strip()]

        if "*" in origins:
            raise ValueError("CORS_ORIGINS cannot include '*'. Use explicit origins.")

        return origins

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
