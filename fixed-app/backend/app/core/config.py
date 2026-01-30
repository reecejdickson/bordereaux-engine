"""Configuration - NO IMPORTS FROM OTHER APP MODULES"""
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://bordereaux:bordereaux123@db:5432/bordereaux"
    SYNC_DATABASE_URL: str = "postgresql://bordereaux:bordereaux123@db:5432/bordereaux"
    REDIS_URL: str = "redis://redis:6379"
    SECRET_KEY: str = "dev-secret-key-change-in-production-1234567890"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    STORAGE_PATH: str = "/app/uploads"
    
    class Config:
        extra = "allow"

settings = Settings()
