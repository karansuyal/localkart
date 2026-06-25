from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:admin123@localhost:5432/localkart"
    REDIS_URL: str = "redis://localhost:6379"
    SECRET_KEY: str = "localkart-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 525600   
    REFRESH_TOKEN_EXPIRE_DAYS: int = 3650      
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_PHONE_NUMBER: str = ""
    FIREBASE_SERVICE_ACCOUNT_JSON: str = ""   
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""
    GOOGLE_MAPS_API_KEY: str = ""
    AI_SERVICE_URL: str = "http://localhost:8001"
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"
    # Unsplash
    UNSPLASH_ACCESS_KEY: str = os.getenv("UNSPLASH_ACCESS_KEY", "")
    UNSPLASH_SECRET_KEY: str = os.getenv("UNSPLASH_SECRET_KEY", "")

    @property
    def cors_origins_list(self) -> List[str]:
        return [x.strip() for x in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()