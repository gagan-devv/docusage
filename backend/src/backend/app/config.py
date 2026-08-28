from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    db_user: str = Field(default="docusage", validation_alias="POSTGRES_USER")
    db_password: str = Field(default="yourpassword", validation_alias="POSTGRES_PASSWORD")
    db_host: str = "localhost"
    db_port: int = 5432
    db_name: str = Field(default="docusage", validation_alias="POSTGRES_DB")
    redis_host: str = "localhost"
    redis_port: int = 6379
    hf_token: str = ""
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/0"
    mlflow_tracking_uri: str = Field(default="http://localhost:5000", validation_alias="MLFLOW_TRACKING_URI")
    mlflow_experiment_name: str = Field(default="docusage-contract-analysis", validation_alias="MLFLOW_EXPERIMENT_NAME")
    mlflow_enabled: bool = Field(default=True, validation_alias="MLFLOW_ENABLED")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

settings = Settings()