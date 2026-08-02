"""Shared dependencies for addon_routes/* routers — re-exports existing
helpers so nothing is duplicated across routes.py and the new files."""
from __future__ import annotations

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException

from security import (
    require_section,
    require_admin,
    get_current_user_optional,
    get_or_create_voice_session,
    voice_anon_label,
    check_ip_not_blocked,
)

NOT_DELETED = {"deleted_at": None}


def _oid(id_: str) -> ObjectId:
    try:
        return ObjectId(id_)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=400, detail="Invalid ID")


def _clean(value):
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, dict):
        return {k: _clean(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_clean(v) for v in value]
    return value


# --- Added for addon_routes/admin_super.py ---
from security import require_super_admin


def _client_ip(request):
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"
