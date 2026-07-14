"""Security helpers: password hashing, JWT, role-based dependencies."""
from __future__ import annotations

import os
from datetime import timedelta
from typing import Optional

import bcrypt
import jwt
from bson import ObjectId
from fastapi import Depends, HTTPException, Request, status

from db import get_db, utcnow

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_TTL = timedelta(hours=8)
REFRESH_TOKEN_TTL = timedelta(days=7)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def _secret() -> str:
    return os.environ["JWT_SECRET"]


def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": utcnow() + ACCESS_TOKEN_TTL,
        "type": "access",
    }
    return jwt.encode(payload, _secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": utcnow() + REFRESH_TOKEN_TTL,
        "type": "refresh",
    }
    return jwt.encode(payload, _secret(), algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    return jwt.decode(token, _secret(), algorithms=[JWT_ALGORITHM])


def _extract_token(request: Request) -> Optional[str]:
    token = request.cookies.get("access_token")
    if token:
        return token
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth[7:]
    return None


async def get_current_user(request: Request) -> dict:
    token = _extract_token(request)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    db = get_db()
    user = await db.users.find_one({"_id": ObjectId(payload["sub"]), "deleted_at": None})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    user["_id"] = str(user["_id"])
    user.pop("password_hash", None)
    return user


async def get_current_user_optional(request: Request) -> Optional[dict]:
    token = _extract_token(request)
    if not token:
        return None
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            return None
    except jwt.InvalidTokenError:
        return None
    db = get_db()
    user = await db.users.find_one({"_id": ObjectId(payload["sub"]), "deleted_at": None})
    if not user:
        return None
    user["_id"] = str(user["_id"])
    user.pop("password_hash", None)
    return user


async def get_current_user_optional(request: Request) -> Optional[dict]:
    token = _extract_token(request)
    if not token:
        return None
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            return None
    except jwt.InvalidTokenError:
        return None
    db = get_db()
    user = await db.users.find_one({"_id": ObjectId(payload["sub"]), "deleted_at": None})
    if not user:
        return None
    user["_id"] = str(user["_id"])
    user.pop("password_hash", None)
    return user


def require_role(*roles: str):
    async def dep(user: dict = Depends(get_current_user)) -> dict:
        if user.get("role") not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user

    return dep


require_super_admin = require_role("super_admin")
require_admin = require_role("super_admin", "admin")
require_authenticated = require_role("super_admin", "admin", "user")


def set_auth_cookies(response, access_token: str, refresh_token: str) -> None:
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=int(ACCESS_TOKEN_TTL.total_seconds()),
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=int(REFRESH_TOKEN_TTL.total_seconds()),
        path="/",
    )


def clear_auth_cookies(response) -> None:
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")

# ==========================================================================
# Append this block to the end of security.py.
# Follows the exact same factory-function pattern as require_role() above.
# ==========================================================================

#DASHBOARD_SECTIONS = ["politicians", "articles", "reference_data", "signups", "audit_log"]

DASHBOARD_SECTIONS = [
    "admins",           # Admins.jsx
    "articles",         # Articles.jsx, ArticleEditor.jsx
    "audit_log",        # AuditLog.jsx
    "community_desk",   # CommunityDesk.jsx
    "dashboard_home",   # DashboardHome.jsx
    "politicians",      # PoliticiansList.jsx, PoliticianForm.jsx
    "reference_data",   # ReferenceData.jsx
    "signups",          # SignupQueue.jsx
    "tickets",          # TicketDetail.jsx
    "trash",            # Trash.jsx
    "visitors"          # Visitors.jsx, VisitorDetail.jsx
]


def require_section(section: str):
    """
    Gate a route (or an entire router) behind a named dashboard-section
    permission. super_admin always passes. A plain admin/user passes only
    if their stored `permissions[section]` is True. Layers on top of
    require_admin, so it still enforces "must be admin or super_admin"
    as a baseline.
    """
    async def dep(user: dict = Depends(require_admin)) -> dict:
        if user.get("role") == "super_admin":
            return user
        if not user.get("permissions", {}).get(section, False):
            raise HTTPException(status_code=403, detail=f"No access to '{section}'")
        return user

    return dep


def can_access_politician(user: dict, politician: dict) -> bool:
    """
    Checks a single politician document against the admin's geo_scope.
    super_admin and unrestricted admins always pass. Otherwise, the
    politician must match at least one assigned rule (country/state/
    city/constituency) — rules are OR'd together, so an admin can hold
    a broad country-level grant plus extra specific states elsewhere.
    """
    if user.get("role") == "super_admin":
        return True
    scope = user.get("geo_scope") or {}
    if scope.get("unrestricted", True):
        return True
    field_by_level = {
        "country": "country_code",
        "state": "state_id",
        "city": "city_id",
        "constituency": "constituency_id",
    }
    for rule in scope.get("rules", []):
        field = field_by_level.get(rule.get("level"))
        if field and politician.get(field) == rule.get("value"):
            return True
    return False


def geo_scope_mongo_filter(user: dict) -> dict:
    """
    Builds a Mongo filter clause restricting a *list* query to only the
    politicians this admin is allowed to see. Returns {} (no restriction)
    for super_admin or an unrestricted admin. Merge the result into an
    existing query with $and if you already have other filter conditions.
    """
    if user.get("role") == "super_admin":
        return {}
    scope = user.get("geo_scope") or {}
    if scope.get("unrestricted", True):
        return {}
    field_by_level = {
        "country": "country_code",
        "state": "state_id",
        "city": "city_id",
        "constituency": "constituency_id",
    }
    rules = scope.get("rules", [])
    if not rules:
        # Scoped but zero rules assigned — no access to anything.
        return {"_id": {"$exists": False}}
    ors = []
    for rule in rules:
        field = field_by_level.get(rule.get("level"))
        if field:
            ors.append({field: rule.get("value")})
    return {"$or": ors} if ors else {"_id": {"$exists": False}}
