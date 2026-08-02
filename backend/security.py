"""Security helpers: password hashing, JWT, role-based dependencies."""
from __future__ import annotations

import os
import jwt
import hmac
import bcrypt
import hashlib
import secrets as _secrets


from datetime import timedelta
from typing import Optional
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


def create_access_token(user_id: str, email: str, role: str, token_version: int = 0) -> str:
    now = utcnow()
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "iat": now,
        "exp": now + ACCESS_TOKEN_TTL,
        "type": "access",
        "tv": token_version,  # bump user's stored token_version to invalidate all outstanding tokens
    }
    return jwt.encode(payload, _secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str, token_version: int = 0) -> str:
    now = utcnow()
    payload = {
        "sub": user_id,
        "iat": now,
        "exp": now + REFRESH_TOKEN_TTL,
        "type": "refresh",
        "tv": token_version,
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

    # Optional revocation check: if a user doc has a token_version field,
    # any token minted before it was bumped (password reset, forced
    # logout, admin suspension) is rejected even though it hasn't expired.
    # Tokens minted without "tv" (older clients) default to 0 and still
    # work as long as the user's stored token_version is also 0/unset.
    if user.get("token_version", 0) != payload.get("tv", 0):
        raise HTTPException(status_code=401, detail="Token revoked")

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
    if user.get("token_version", 0) != payload.get("tv", 0):
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
        samesite="lax",
        max_age=int(ACCESS_TOKEN_TTL.total_seconds()),
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="lax",  # changed from "none" -- frontend/API are same-origin behind nginx,
        max_age=int(REFRESH_TOKEN_TTL.total_seconds()),  # so "none" only widened CSRF exposure for no reason
        path="/",
    )


def clear_auth_cookies(response) -> None:
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")

# ==========================================================================
# Anonymous voice-session cookie + IP blocking
# ==========================================================================

VOICE_HMAC_SECRET = os.environ["VOICE_HMAC_SECRET"]
VOICE_SESSION_COOKIE = "voice_session"


def get_or_create_voice_session(request: Request, response) -> str:
    """
    Returns the anonymous session id for this browser, issuing a new
    session-only cookie (no max_age -> cleared on browser close) if none
    exists yet. This id is never exposed to the client as anything more
    than an opaque cookie value — labels/derivations happen server-side.
    """
    sid = request.cookies.get(VOICE_SESSION_COOKIE)
    if sid:
        return sid
    sid = _secrets.token_hex(24)
    response.set_cookie(
        key=VOICE_SESSION_COOKIE,
        value=sid,
        httponly=True,
        secure=True,
        samesite="strict",
        path="/",
        # no max_age/expires => session cookie, cleared on browser close
    )
    return sid


def voice_anon_label(session_id: str, article_id: str) -> str:
    """Deterministic per-thread anon label, derived server-side via HMAC
    so the raw session id is never used directly and can't be reversed."""
    digest = hmac.new(
        VOICE_HMAC_SECRET.encode("utf-8"),
        f"{session_id}::{article_id}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return f"Anon-{digest[:8]}"


def _client_ip_from_request(request: Request) -> str:
    """
    Trust order matters here. nginx's `X-Real-IP` header is set from
    $remote_addr (the actual TCP peer) and is always OVERWRITTEN by
    proxy_set_header -- it cannot be spoofed by the client.

    X-Forwarded-For, by contrast, is APPENDED to by nginx
    ($proxy_add_x_forwarded_for), meaning a client can prepend their own
    fake entries and the *first* item in that list is attacker-controlled.
    Taking fwd.split(",")[0] (the old behavior) let anyone bypass
    blocked_ips and IP-based voice throttling by just sending their own
    X-Forwarded-For header.

    So: prefer X-Real-IP. Only fall back to XFF (taking the LAST entry,
    the one nginx itself appended) if X-Real-IP is somehow missing.
    """
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[-1].strip()
    return request.client.host if request.client else "unknown"


async def check_ip_not_blocked(request: Request) -> str:
    """Dependency: raises 403 if the caller's IP is on the manual block
    list. Returns the resolved IP so routes can reuse it without a second
    lookup."""
    ip = _client_ip_from_request(request)
    db = get_db()
    blocked = await db.blocked_ips.find_one({"ip": ip})
    if blocked:
        raise HTTPException(status_code=403, detail="Access denied")
    return ip

# ==========================================================================
# Dashboard section permissions
# ==========================================================================

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
    "visitors",         # Visitors.jsx, VisitorDetail.jsx
    "voice",            # Visitors.jsx, VisitorDetail.jsx
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
    if scope.get("unrestricted", False):
        return False
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
