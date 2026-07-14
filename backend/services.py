"""Service abstractions: EmailService, UploadService, Audit helper."""
from __future__ import annotations

import logging
import os
import secrets
import shutil
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any, Optional

from bson import ObjectId
from fastapi import UploadFile

from db import get_db, utcnow_iso

log = logging.getLogger("trackmp.services")


# =========================================================================
# EMAIL SERVICE
# =========================================================================
class EmailProvider(ABC):
    @abstractmethod
    async def send(self, *, to: str, subject: str, body: str, kind: str, meta: dict | None = None) -> None: ...


class LogEmailProvider(EmailProvider):
    """Writes to DB (email_logs) + console. Default provider."""

    async def send(self, *, to: str, subject: str, body: str, kind: str, meta: dict | None = None) -> None:
        db = get_db()
        entry = {
            "to": to,
            "subject": subject,
            "body": body,
            "kind": kind,
            "meta": meta or {},
            "sent_at": utcnow_iso(),
            "provider": "log",
        }
        await db.email_logs.insert_one(entry)
        log.info("[EMAIL:%s] to=%s subject=%s\n%s", kind, to, subject, body)


class EmailService:
    _provider: EmailProvider = LogEmailProvider()

    @classmethod
    def set_provider(cls, provider: EmailProvider) -> None:
        cls._provider = provider

    @classmethod
    async def send(cls, *, to: str, subject: str, body: str, kind: str, meta: dict | None = None) -> None:
        await cls._provider.send(to=to, subject=subject, body=body, kind=kind, meta=meta)


# =========================================================================
# UPLOAD SERVICE
# =========================================================================
class UploadProvider(ABC):
    @abstractmethod
    async def save(self, file: UploadFile, subdir: str = "images") -> str:
        """Return public URL (relative or absolute)."""


class LocalDiskUploadProvider(UploadProvider):
    def __init__(self, base_dir: str, public_base: str) -> None:
        self.base_dir = Path(base_dir)
        self.public_base = public_base.rstrip("/")
        self.base_dir.mkdir(parents=True, exist_ok=True)

    async def save(self, file: UploadFile, subdir: str = "images") -> str:
        ext = ""
        if file.filename and "." in file.filename:
            ext = "." + file.filename.rsplit(".", 1)[-1].lower()
        if ext not in ("", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".pdf", ".mp4", ".mov", ".webm", ".avi", ".mkv", ".html", ".htm"):
            ext = ""
        name = f"{secrets.token_hex(12)}{ext}"
        dest_dir = self.base_dir / subdir
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest = dest_dir / name
        with dest.open("wb") as f:
            shutil.copyfileobj(file.file, f)
        return f"{self.public_base}/{subdir}/{name}"


class UploadService:
    _provider: Optional[UploadProvider] = None

    @classmethod
    def set_provider(cls, provider: UploadProvider) -> None:
        cls._provider = provider

    @classmethod
    def provider(cls) -> UploadProvider:
        if cls._provider is None:
            cls._provider = LocalDiskUploadProvider(
                os.environ.get("UPLOAD_DIR", "/app/backend/uploads"),
                os.environ.get("PUBLIC_UPLOAD_BASE", "/api/uploads"),
            )
        return cls._provider

    @classmethod
    async def save(cls, file: UploadFile, subdir: str = "images") -> str:
        return await cls.provider().save(file, subdir)


# =========================================================================
# AUDIT LOG
# =========================================================================
async def audit_log(
    *,
    actor: dict | None,
    action: str,
    entity_type: str,
    entity_id: str,
    changed_fields: dict | None = None,
    ip: str | None = None,
) -> None:
    """Append-only audit event."""
    db = get_db()
    entry = {
        "actor_id": actor.get("_id") if actor else None,
        "actor_email": actor.get("email") if actor else None,
        "actor_role": actor.get("role") if actor else None,
        "action": action,
        "entity_type": entity_type,
        "entity_id": str(entity_id),
        "changed_fields": changed_fields or {},
        "ip": ip,
        "timestamp": utcnow_iso(),
    }
    await db.audit_events.insert_one(entry)


def diff_dict(before: dict | None, after: dict | None, keys: list[str] | None = None) -> dict:
    """Build a compact JSON diff of changed fields."""
    before = before or {}
    after = after or {}
    all_keys = keys if keys else set(before.keys()) | set(after.keys())
    changes: dict[str, dict[str, Any]] = {}
    for k in all_keys:
        b = before.get(k)
        a = after.get(k)
        if b != a:
            changes[k] = {"from": b, "to": a}
    return changes


# =========================================================================
# AUTH PROVIDER REGISTRY (scaffold)
# =========================================================================
class AuthProviderRegistry:
    """Registry for OAuth providers (Google, Facebook, Apple, Microsoft).
    All disabled in Phase 2; UI shows 'Coming Soon' tooltip."""

    _providers: dict[str, dict] = {
        "google": {"name": "Google", "enabled": False, "icon": "google"},
        "facebook": {"name": "Facebook", "enabled": False, "icon": "facebook"},
        "apple": {"name": "Apple", "enabled": False, "icon": "apple"},
        "microsoft": {"name": "Microsoft", "enabled": False, "icon": "microsoft"},
    }

    @classmethod
    def list(cls) -> list[dict]:
        return [{"id": k, **v} for k, v in cls._providers.items()]

    @classmethod
    def enable(cls, provider_id: str) -> None:
        if provider_id in cls._providers:
            cls._providers[provider_id]["enabled"] = True
