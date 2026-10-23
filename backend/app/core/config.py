from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    PROJECT_NAME: str = "WindSight Analytics"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # Elexon Insights Solution base URL
    ELEXON_API_BASE_URL: str = "https://data.elexon.co.uk/bmrs/api/v1"
    
    # Day-ahead decision cutoff assumption
    # Default: 11:00:00 UTC (EPEX SPOT GB Day-Ahead auction gate closure)
    DEFAULT_CUTOFF_TIME: str = "11:00:00"
    
    # Decision month restriction as specified
    DEFAULT_DECISION_MONTH: str = "2026-01"
    
    # Cache settings
    CACHE_ENABLED: bool = True
    CACHE_DIR: Path = Path(__file__).resolve().parent.parent.parent / "cache"
    CACHE_TTL_SECONDS: int = 86400  # 24 hours for immutable historical records
    
    # Request timeout in seconds for upstream Elexon API calls
    HTTP_TIMEOUT_SECONDS: float = 30.0
    
    # CORS Origins
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ]
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
