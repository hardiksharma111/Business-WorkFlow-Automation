from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ollama_host: str = "http://localhost:11434"
    ollama_model: str = "llama3.2:3b"
    hf_embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    chroma_persist_path: str = "./data/chroma"
    chroma_collection: str = "workflow_memory"
    auto_execute_threshold: float = 0.80
    suggest_only_threshold: float = 0.55
    cors_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3001",
        ]
    )
    warmup_interval_seconds: int = 300
    enable_periodic_warmup: bool = True

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
