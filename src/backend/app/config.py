from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    db_user: str
    db_password: str
    db_host: str
    db_port: int
    db_name: str
    redis_host: str
    redis_port: int
    hf_token: str
    
    class Config:
        env_file: ".env"
        
settings = Settings()