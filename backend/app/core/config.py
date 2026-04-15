from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Postgres
    DATABASE_URL: str = "postgresql+asyncpg://lexsmart:lexsmart_secret@postgres:5432/lexsmart"

    # JWT
    SECRET_KEY: str = "change-me-to-a-random-string"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # ChromaDB
    CHROMA_HOST: str = "chromadb"
    CHROMA_PORT: int = 8000

    # LLM
    OPENAI_API_KEY: str = ""
    OPENAI_BASE_URL: str = "https://llm.alem.ai/v1"
    LLM_MODEL: str = "alemllm"

    # Embeddings (separate API key)
    EMBED_API_KEY: str = ""
    EMBED_BASE_URL: str = "https://llm.alem.ai/v1"
    EMBED_MODEL: str = "text-1024"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
