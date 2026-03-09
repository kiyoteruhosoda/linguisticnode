# app/storage.py
from __future__ import annotations
import asyncio
import json
import os
from pathlib import Path
from typing import Any, Dict
from datetime import datetime, timezone
from .settings import settings

UTC = timezone.utc

_user_locks: dict[str, asyncio.Lock] = {}

def user_lock(userId: str) -> asyncio.Lock:
    if userId not in _user_locks:
        _user_locks[userId] = asyncio.Lock()
    return _user_locks[userId]

def now_iso() -> str:
    return datetime.now(UTC).isoformat()

def ensure_dirs() -> None:
    (settings.data_dir / "users").mkdir(parents=True, exist_ok=True)
    (settings.data_dir / "vault").mkdir(parents=True, exist_ok=True)

def users_file_path() -> Path:
    return settings.data_dir / "users" / "users.json"

def user_dir(userId: str) -> Path:
    # usernameは使わず userId だけでパス決定（パストラバーサル防止）
    return settings.data_dir / "vault" / f"u_{userId}"

def read_json(path: Path) -> Dict[str, Any]:
    if not path.exists():
        return {}
    result: Dict[str, Any] = json.loads(path.read_text(encoding="utf-8"))
    return result

def atomic_write_json(path: Path, data: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    payload = json.dumps(data, ensure_ascii=False, indent=2)
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(payload)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, path)
