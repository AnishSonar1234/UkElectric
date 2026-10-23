import os
import json
import hashlib
import time
import logging
from pathlib import Path
from typing import Any, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)


class FileCacheService:
    def __init__(self, cache_dir: Optional[Path] = None):
        self.cache_dir = cache_dir or settings.CACHE_DIR
        self.enabled = settings.CACHE_ENABLED
        self.default_ttl = settings.CACHE_TTL_SECONDS
        if self.enabled:
            os.makedirs(self.cache_dir, exist_ok=True)

    def _get_key_hash(self, key: str) -> str:
        return hashlib.sha256(key.encode('utf-8')).hexdigest()

    def _get_cache_path(self, key: str) -> Path:
        filename = f"{self._get_key_hash(key)}.json"
        return self.cache_dir / filename

    def get(self, key: str) -> Optional[Any]:
        if not self.enabled:
            return None
        
        cache_path = self._get_cache_path(key)
        if not cache_path.exists():
            return None
        
        try:
            with open(cache_path, "r", encoding="utf-8") as f:
                envelope = json.load(f)
            
            expires_at = envelope.get("expires_at", 0)
            if expires_at and time.time() > expires_at:
                logger.info(f"Cache expired for key: {key}")
                try:
                    cache_path.unlink()
                except OSError:
                    pass
                return None
            
            logger.info(f"Cache HIT for key: {key}")
            return envelope.get("data")
        except Exception as e:
            logger.warning(f"Error reading cache for key {key}: {e}")
            return None

    def set(self, key: str, data: Any, ttl: Optional[int] = None) -> bool:
        if not self.enabled:
            return False
        
        ttl_seconds = ttl if ttl is not None else self.default_ttl
        expires_at = time.time() + ttl_seconds if ttl_seconds > 0 else None
        cache_path = self._get_cache_path(key)
        
        envelope = {
            "key": key,
            "created_at": time.time(),
            "expires_at": expires_at,
            "data": data
        }
        
        try:
            temp_path = cache_path.with_suffix(".tmp")
            with open(temp_path, "w", encoding="utf-8") as f:
                json.dump(envelope, f)
            temp_path.replace(cache_path)
            logger.info(f"Cache SET for key: {key}")
            return True
        except Exception as e:
            logger.warning(f"Error writing cache for key {key}: {e}")
            return False

    def count(self) -> int:
        if not self.enabled or not self.cache_dir.exists():
            return 0
        return len(list(self.cache_dir.glob("*.json")))

    def clear(self) -> int:
        if not self.enabled or not self.cache_dir.exists():
            return 0
        files = list(self.cache_dir.glob("*.json"))
        count = 0
        for f in files:
            try:
                f.unlink()
                count += 1
            except OSError:
                pass
        return count


cache_service = FileCacheService()
