from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ollama_host: str = "http://localhost:11434"
    ollama_model: str = "llama3.2:3b"
    hf_embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    chroma_persist_path: str = "./data/chroma"
    chroma_collection: str = "workflow_memory"
    auto_execute_threshold: float = 0.80
    suggest_only_threshold: float = 0.55
    warmup_interval_seconds: int = 300
    enable_periodic_warmup: bool = True

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
