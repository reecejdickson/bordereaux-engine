"""Storage service"""
import os
import uuid
from pathlib import Path
from app.core.config import settings

class StorageService:
    def __init__(self):
        self.path = Path(settings.STORAGE_PATH)
        self.path.mkdir(parents=True, exist_ok=True)
    
    def save_file(self, content: bytes, tenant_id, filename: str) -> str:
        tenant_dir = self.path / str(tenant_id)
        tenant_dir.mkdir(parents=True, exist_ok=True)
        unique_name = f"{uuid.uuid4()}_{filename}"
        file_path = tenant_dir / unique_name
        with open(file_path, "wb") as f:
            f.write(content)
        return str(file_path.relative_to(self.path))
    
    def get_file(self, relative_path: str):
        file_path = self.path / relative_path
        if not file_path.exists():
            return None
        with open(file_path, "rb") as f:
            return f.read()

storage_service = StorageService()
