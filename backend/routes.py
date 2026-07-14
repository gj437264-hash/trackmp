"""All API routes for TrackMP."""
from __future__ import annotations

import bleach
import csv
import io
import os
import re
import secrets
from datetime import timedelta
from typing import Any, List, Optional

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, Response, UploadFile
from pydantic import EmailStr
from bs4 import BeautifulSoup

from db import get_db, utcnow, utcnow_iso
from models import (
    AdminCreateIn,
    ArticleBodyIn,
    ArticleIn,
    ArticleUpdateIn,
    BioIn,
    AdminUpdateIn,
    CityIn,
    CityUpdateIn,
    ConstituencyIn,
    ConstituencyUpdateIn,
    ContactIn,
    CountryIn,
    CountryUpdateIn,
    ForgotPasswordIn,
    LoginIn,
    MagicRegisterIn,
    PartyHistoryIn,
    PartyHistoryUpdateIn,
    PoliticianIn,
    PoliticianUpdateIn,
    PositionHistoryIn,
    PositionHistoryUpdateIn,
    PromiseIn,
    PromiseStatus,
    PromiseUpdateIn,
    PurgeIn,
    RelativeIn,
    ResetPasswordIn,
    RestoreIn,
    SignupDecisionIn,
    SignupRequestIn,
    StateIn,
    StateUpdateIn,
    TicketApproveIn,
    TicketAssignIn,
    TicketMergeIn,
    TicketMessageIn,
    TicketRejectIn,
    TicketStatusIn,
    UpdateRequestIn,
    WealthEntryIn,
)
from security import (
    can_access_politician,
    clear_auth_cookies,
    create_access_token,
    create_refresh_token,
    decode_token,
    geo_scope_mongo_filter,
    get_current_user,
    get_current_user_optional,
    hash_password,
    require_admin,
    require_authenticated,
    require_section,
    require_super_admin,
    set_auth_cookies,
    verify_password,
)
from services import AuthProviderRegistry, EmailService, UploadService, audit_log, diff_dict

router = APIRouter(prefix="/api")


# =========================================================================
# HELPERS
# =========================================================================
NOT_DELETED = {"deleted_at": None}


def _oid(id_: str) -> ObjectId:
    try:
        return ObjectId(id_)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=400, detail="Invalid ID")


def _serialize(doc: dict | None) -> dict | None:
    if doc is None:
        return None
    d = dict(doc)
    d["id"] = str(d.pop("_id"))
    return d


def _serialize_list(docs: list[dict]) -> list[dict]:
    return [_serialize(d) for d in docs]


def _client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


ENTITY_COLLECTIONS = {
    "politician": "politicians",
    "user": "users",
    "country": "countries",
    "state": "states",
    "city": "cities",
    "constituency": "constituencies",
    "relative": "relatives",
    "wealth": "wealth_entries",
}

ENTITY_NAME_FIELDS = {
    "politician": "name",
    "user": "email",
    "country": "name",
    "state": "name",
    "city": "name",
    "constituency": "name",
    "relative": "name",
    "wealth": "year",
}


# =========================================================================
# AUTH ROUTES
# =========================================================================
@router.post("/auth/login")
async def login(payload: LoginIn, response: Response, request: Request):
    db = get_db()
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email, "deleted_at": None})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user_id = str(user["_id"])
    role = user["role"]
    access = create_access_token(user_id, email, role)
    refresh = create_refresh_token(user_id)
    set_auth_cookies(response, access, refresh)

    await audit_log(
        actor={"_id": user_id, "email": email, "role": role},
        action="login",
        entity_type="user",
        entity_id=user_id,
        ip=_client_ip(request),
    )

    return {
        "id": user_id,
        "email": email,
        "name": user.get("name"),
        "role": role,
        "access_token": access,
    }


@router.post("/auth/logout")
async def logout(response: Response, user: dict = Depends(get_current_user)):
    clear_auth_cookies(response)
    return {"ok": True}


@router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return {
        "id": user["_id"],
        "email": user["email"],
        "name": user.get("name"),
        "role": user["role"],
    }


@router.post("/auth/refresh")
async def refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = decode_token(token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    db = get_db()
    user = await db.users.find_one({"_id": ObjectId(payload["sub"]), "deleted_at": None})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    access = create_access_token(str(user["_id"]), user["email"], user["role"])
    new_refresh = create_refresh_token(str(user["_id"]))
    set_auth_cookies(response, access, new_refresh)
    return {"ok": True}


@router.post("/auth/register-magic")
async def register_magic(payload: MagicRegisterIn, response: Response, request: Request):
    db = get_db()
    tok = await db.invite_tokens.find_one({"token": payload.token, "used_at": None})
    if not tok:
        raise HTTPException(status_code=400, detail="Invalid or used invitation token")
    if utcnow_iso() > tok["expires_at"]:
        raise HTTPException(status_code=400, detail="Invitation token expired")

    signup = await db.signup_requests.find_one({"_id": tok["signup_request_id"]})
    if not signup:
        raise HTTPException(status_code=400, detail="Signup request missing")

    email = signup["email"].lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=409, detail="Account already exists")

    new_user = {
        "email": email,
        "name": payload.name or signup["full_name"],
        "role": "user",
        "country_code": signup["country_code"],
        "password_hash": hash_password(payload.password),
        "created_at": utcnow_iso(),
        "updated_at": utcnow_iso(),
        "deleted_at": None,
    }
    result = await db.users.insert_one(new_user)
    await db.invite_tokens.update_one({"_id": tok["_id"]}, {"$set": {"used_at": utcnow_iso()}})
    await db.signup_requests.update_one(
        {"_id": signup["_id"]},
        {"$set": {"status": "activated", "activated_at": utcnow_iso(), "updated_at": utcnow_iso()}},
    )

    user_id = str(result.inserted_id)
    access = create_access_token(user_id, email, "user")
    refresh_tok = create_refresh_token(user_id)
    set_auth_cookies(response, access, refresh_tok)

    await audit_log(
        actor={"_id": user_id, "email": email, "role": "user"},
        action="account_activated",
        entity_type="user",
        entity_id=user_id,
        ip=_client_ip(request),
    )
    return {"id": user_id, "email": email, "name": new_user["name"], "role": "user"}


@router.get("/auth/invitation/{token}")
async def get_invitation(token: str):
    db = get_db()
    tok = await db.invite_tokens.find_one({"token": token, "used_at": None})
    if not tok:
        raise HTTPException(status_code=404, detail="Invalid or used invitation")
    if utcnow_iso() > tok["expires_at"]:
        raise HTTPException(status_code=400, detail="Invitation expired")
    signup = await db.signup_requests.find_one({"_id": tok["signup_request_id"]})
    if not signup:
        raise HTTPException(status_code=404, detail="Missing signup")
    return {
        "email": signup["email"],
        "full_name": signup["full_name"],
        "country_code": signup["country_code"],
    }


@router.post("/auth/forgot-password")
async def forgot_password(payload: ForgotPasswordIn):
    db = get_db()
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email, "deleted_at": None})
    if user:
        token = secrets.token_urlsafe(32)
        expires = (utcnow() + timedelta(hours=1)).isoformat()
        await db.password_reset_tokens.insert_one(
            {"token": token, "user_id": user["_id"], "expires_at": expires, "used_at": None}
        )
        reset_link = f"{os.environ.get('FRONTEND_APP_URL', '')}/reset-password?token={token}"
        await EmailService.send(
            to=email,
            subject="TrackMP: password reset",
            body=f"Reset your password: {reset_link}",
            kind="password_reset",
            meta={"reset_link": reset_link},
        )
    return {"ok": True}


@router.post("/auth/reset-password")
async def reset_password(payload: ResetPasswordIn):
    db = get_db()
    tok = await db.password_reset_tokens.find_one({"token": payload.token, "used_at": None})
    if not tok:
        raise HTTPException(status_code=400, detail="Invalid reset token")
    if utcnow_iso() > tok["expires_at"]:
        raise HTTPException(status_code=400, detail="Reset token expired")
    hashed = hash_password(payload.password)
    await db.users.update_one(
        {"_id": tok["user_id"]}, {"$set": {"password_hash": hashed, "updated_at": utcnow_iso()}}
    )
    await db.password_reset_tokens.update_one({"_id": tok["_id"]}, {"$set": {"used_at": utcnow_iso()}})
    return {"ok": True}


@router.get("/auth/providers")
async def list_auth_providers():
    return {"providers": AuthProviderRegistry.list()}


# =========================================================================
# SIGNUP REQUESTS (public + super admin)
# =========================================================================
@router.post("/signup-requests")
async def create_signup_request(payload: SignupRequestIn, request: Request):
    db = get_db()
    email = payload.email.lower().strip()
    existing_user = await db.users.find_one({"email": email, "deleted_at": None})
    if existing_user:
        raise HTTPException(status_code=409, detail="An account already exists for this email")
    existing_req = await db.signup_requests.find_one(
        {"email": email, "status": "pending"}
    )
    if existing_req:
        return {"ok": True, "message": "Request already pending"}
    country = await db.countries.find_one({"code": payload.country_code, "deleted_at": None})
    if not country:
        raise HTTPException(status_code=400, detail="Invalid country code")
    doc = {
        "full_name": payload.full_name.strip(),
        "email": email,
        "country_code": payload.country_code,
        "status": "pending",
        "created_at": utcnow_iso(),
        "updated_at": utcnow_iso(),
        "ip": _client_ip(request),
        "note": None,
    }
    result = await db.signup_requests.insert_one(doc)
    await audit_log(
        actor=None,
        action="signup_request_created",
        entity_type="signup_request",
        entity_id=str(result.inserted_id),
        changed_fields={"email": email},
        ip=_client_ip(request),
    )
    return {"ok": True, "id": str(result.inserted_id)}


@router.get("/admin/signup-requests")
async def list_signup_requests(
    status_filter: Optional[str] = Query(None, alias="status"),
    _user: dict = Depends(require_super_admin),
):
    db = get_db()
    q: dict = {}
    if status_filter:
        q["status"] = status_filter
    docs = await db.signup_requests.find(q).sort("created_at", -1).to_list(500)
    return {"items": _serialize_list(docs)}


@router.post("/admin/signup-requests/{req_id}/approve")
async def approve_signup(req_id: str, payload: SignupDecisionIn, request: Request, user: dict = Depends(require_super_admin)):
    db = get_db()
    req = await db.signup_requests.find_one({"_id": _oid(req_id)})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if req["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Request is {req['status']}")

    token = secrets.token_urlsafe(32)
    expires = (utcnow() + timedelta(hours=24)).isoformat()
    await db.invite_tokens.insert_one(
        {
            "token": token,
            "signup_request_id": req["_id"],
            "expires_at": expires,
            "used_at": None,
            "created_at": utcnow_iso(),
        }
    )
    await db.signup_requests.update_one(
        {"_id": req["_id"]},
        {"$set": {"status": "approved", "updated_at": utcnow_iso(), "note": payload.note, "approved_by": user["_id"]}},
    )
    invite_link = f"{os.environ.get('FRONTEND_APP_URL', '')}/accept-invite?token={token}"
    await EmailService.send(
        to=req["email"],
        subject="Welcome to TrackMP — activate your account",
        body=(
            f"Hi {req['full_name']},\n\nYour TrackMP signup was approved.\n"
            f"Click the link below to set your password (valid 24 hours):\n{invite_link}\n\n— TrackMP"
        ),
        kind="signup_approval",
        meta={"invite_link": invite_link, "signup_request_id": str(req["_id"])},
    )
    await audit_log(
        actor=user,
        action="signup_request_approved",
        entity_type="signup_request",
        entity_id=str(req["_id"]),
        changed_fields={"status": {"from": "pending", "to": "approved"}},
        ip=_client_ip(request),
    )
    return {"ok": True, "invite_link": invite_link}


@router.post("/admin/signup-requests/{req_id}/reject")
async def reject_signup(req_id: str, payload: SignupDecisionIn, request: Request, user: dict = Depends(require_super_admin)):
    db = get_db()
    req = await db.signup_requests.find_one({"_id": _oid(req_id)})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if req["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Request is {req['status']}")
    await db.signup_requests.update_one(
        {"_id": req["_id"]},
        {"$set": {"status": "rejected", "updated_at": utcnow_iso(), "note": payload.note, "rejected_by": user["_id"]}},
    )
    await audit_log(
        actor=user,
        action="signup_request_rejected",
        entity_type="signup_request",
        entity_id=str(req["_id"]),
        changed_fields={"status": {"from": "pending", "to": "rejected"}, "note": payload.note},
        ip=_client_ip(request),
    )
    return {"ok": True}


# =========================================================================
# ADMIN MANAGEMENT (super_admin only)
# =========================================================================
@router.get("/admin/admins")
async def list_admins(_user: dict = Depends(require_super_admin)):
    db = get_db()
    docs = await db.users.find({"role": {"$in": ["admin", "super_admin"]}, "deleted_at": None}).to_list(500)
    for d in docs:
        d.pop("password_hash", None)
    return {"items": _serialize_list(docs)}


@router.post("/admin/admins")
async def create_admin(payload: AdminCreateIn, request: Request, user: dict = Depends(require_super_admin)):
    db = get_db()
    email = payload.email.lower().strip()
    if await db.users.find_one({"email": email, "deleted_at": None}):
        raise HTTPException(status_code=409, detail="Email already in use")
    doc = {
        "email": email,
        "name": payload.name,
        "role": "admin",
        "password_hash": hash_password(payload.password),
        "country_code": None,
        "permissions": payload.permissions or {},
        "geo_scope": payload.geo_scope.model_dump() if payload.geo_scope else {"unrestricted": True, "rules": []},
        "created_at": utcnow_iso(),
        "updated_at": utcnow_iso(),
        "deleted_at": None,
    }
    result = await db.users.insert_one(doc)
    await audit_log(
        actor=user,
        action="admin_created",
        entity_type="user",
        entity_id=str(result.inserted_id),
        changed_fields={"email": email, "role": "admin"},
        ip=_client_ip(request),
    )
    return {"ok": True, "id": str(result.inserted_id)}


@router.put("/admin/admins/{user_id}")
async def update_admin(user_id: str, payload: AdminUpdateIn, request: Request, user: dict = Depends(require_super_admin)):
    db = get_db()
    target = await db.users.find_one({"_id": _oid(user_id), "deleted_at": None})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target["role"] == "super_admin":
        raise HTTPException(status_code=403, detail="Cannot modify super admin")
    update: dict[str, Any] = {"updated_at": utcnow_iso()}
    changes: dict = {}
    if payload.name is not None and payload.name != target.get("name"):
        update["name"] = payload.name
        changes["name"] = {"from": target.get("name"), "to": payload.name}
    if payload.role is not None and payload.role != target["role"]:
        update["role"] = payload.role
        changes["role"] = {"from": target["role"], "to": payload.role}
    if payload.password:
        update["password_hash"] = hash_password(payload.password)
        changes["password"] = {"from": "***", "to": "***"}
    if payload.permissions is not None:
        update["permissions"] = payload.permissions
        changes["permissions"] = {"from": target.get("permissions"), "to": payload.permissions}
    if payload.geo_scope is not None:
        new_geo = payload.geo_scope.model_dump()
        update["geo_scope"] = new_geo
        changes["geo_scope"] = {"from": target.get("geo_scope"), "to": new_geo}
    if len(update) > 1:
        await db.users.update_one({"_id": target["_id"]}, {"$set": update})
        await audit_log(
            actor=user,
            action="admin_updated",
            entity_type="user",
            entity_id=user_id,
            changed_fields=changes,
            ip=_client_ip(request),
        )
    return {"ok": True}


@router.delete("/admin/admins/{user_id}")
async def delete_admin(user_id: str, request: Request, user: dict = Depends(require_super_admin)):
    db = get_db()
    target = await db.users.find_one({"_id": _oid(user_id), "deleted_at": None})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target["role"] == "super_admin":
        raise HTTPException(status_code=403, detail="Cannot delete super admin")
    await db.users.update_one({"_id": target["_id"]}, {"$set": {"deleted_at": utcnow_iso(), "updated_at": utcnow_iso()}})
    await audit_log(
        actor=user,
        action="admin_deleted",
        entity_type="user",
        entity_id=user_id,
        changed_fields={"email": target["email"]},
        ip=_client_ip(request),
    )
    return {"ok": True}


# =========================================================================
# REFERENCE DATA — Countries / States / Cities / Constituencies
# =========================================================================
@router.get("/ref/countries")
async def list_countries():
    db = get_db()
    docs = await db.countries.find(NOT_DELETED).sort("name", 1).to_list(500)
    return {"items": _serialize_list(docs)}


@router.post("/ref/countries")
async def create_country(payload: CountryIn, request: Request, user: dict = Depends(require_admin)):
    db = get_db()
    code = payload.code.upper()
    if await db.countries.find_one({"code": code, "deleted_at": None}):
        raise HTTPException(status_code=409, detail="Country already exists")
    doc = {
        "code": code,
        "name": payload.name,
        "created_at": utcnow_iso(),
        "updated_at": utcnow_iso(),
        "deleted_at": None,
    }
    result = await db.countries.insert_one(doc)
    await audit_log(
        actor=user, action="country_created", entity_type="country",
        entity_id=str(result.inserted_id),
        changed_fields={"code": code, "name": payload.name}, ip=_client_ip(request),
    )
    return {"ok": True, "id": str(result.inserted_id)}


@router.put("/ref/countries/{country_id}")
async def update_country(country_id: str, payload: CountryUpdateIn, request: Request, user: dict = Depends(require_admin)):
    db = get_db()
    existing = await db.countries.find_one({"_id": _oid(country_id), "deleted_at": None})
    if not existing:
        raise HTTPException(status_code=404, detail="Country not found")
    update: dict = {"updated_at": utcnow_iso()}
    if payload.name is not None:
        update["name"] = payload.name
    await db.countries.update_one({"_id": existing["_id"]}, {"$set": update})
    await audit_log(
        actor=user, action="country_updated", entity_type="country",
        entity_id=country_id, changed_fields=diff_dict(existing, {**existing, **update}, ["name"]),
        ip=_client_ip(request),
    )
    return {"ok": True}


@router.delete("/ref/countries/{country_id}")
async def delete_country(country_id: str, request: Request, user: dict = Depends(require_admin)):
    db = get_db()
    existing = await db.countries.find_one({"_id": _oid(country_id), "deleted_at": None})
    if not existing:
        raise HTTPException(status_code=404, detail="Country not found")
    await db.countries.update_one({"_id": existing["_id"]}, {"$set": {"deleted_at": utcnow_iso()}})
    await audit_log(
        actor=user, action="country_deleted", entity_type="country",
        entity_id=country_id, changed_fields={"code": existing["code"]}, ip=_client_ip(request),
    )
    return {"ok": True}


@router.get("/ref/states")
async def list_states(country_code: Optional[str] = None):
    db = get_db()
    q: dict = dict(NOT_DELETED)
    if country_code:
        q["country_code"] = country_code
    docs = await db.states.find(q).sort("name", 1).to_list(2000)
    return {"items": _serialize_list(docs)}


@router.post("/ref/states")
async def create_state(payload: StateIn, request: Request, user: dict = Depends(require_admin)):
    db = get_db()
    country = await db.countries.find_one({"code": payload.country_code, "deleted_at": None})
    if not country:
        raise HTTPException(status_code=400, detail="Invalid country")
    doc = {
        "country_code": payload.country_code,
        "name": payload.name,
        "created_at": utcnow_iso(), "updated_at": utcnow_iso(), "deleted_at": None,
    }
    result = await db.states.insert_one(doc)
    await audit_log(actor=user, action="state_created", entity_type="state",
                    entity_id=str(result.inserted_id), changed_fields=doc, ip=_client_ip(request))
    return {"ok": True, "id": str(result.inserted_id)}


@router.put("/ref/states/{state_id}")
async def update_state(state_id: str, payload: StateUpdateIn, request: Request, user: dict = Depends(require_admin)):
    db = get_db()
    existing = await db.states.find_one({"_id": _oid(state_id), "deleted_at": None})
    if not existing:
        raise HTTPException(status_code=404, detail="State not found")
    update = {"updated_at": utcnow_iso()}
    if payload.name is not None:
        update["name"] = payload.name
    await db.states.update_one({"_id": existing["_id"]}, {"$set": update})
    await audit_log(actor=user, action="state_updated", entity_type="state",
                    entity_id=state_id, changed_fields=diff_dict(existing, {**existing, **update}, ["name"]),
                    ip=_client_ip(request))
    return {"ok": True}


@router.delete("/ref/states/{state_id}")
async def delete_state(state_id: str, request: Request, user: dict = Depends(require_admin)):
    db = get_db()
    existing = await db.states.find_one({"_id": _oid(state_id), "deleted_at": None})
    if not existing:
        raise HTTPException(status_code=404, detail="State not found")
    await db.states.update_one({"_id": existing["_id"]}, {"$set": {"deleted_at": utcnow_iso()}})
    await audit_log(actor=user, action="state_deleted", entity_type="state",
                    entity_id=state_id, changed_fields={"name": existing["name"]}, ip=_client_ip(request))
    return {"ok": True}


@router.get("/ref/cities")
async def list_cities(state_id: Optional[str] = None):
    db = get_db()
    q: dict = dict(NOT_DELETED)
    if state_id:
        q["state_id"] = state_id
    docs = await db.cities.find(q).sort("name", 1).to_list(5000)
    return {"items": _serialize_list(docs)}


@router.post("/ref/cities")
async def create_city(payload: CityIn, request: Request, user: dict = Depends(require_admin)):
    db = get_db()
    state = await db.states.find_one({"_id": _oid(payload.state_id), "deleted_at": None})
    if not state:
        raise HTTPException(status_code=400, detail="Invalid state")
    doc = {
        "state_id": payload.state_id, "name": payload.name,
        "created_at": utcnow_iso(), "updated_at": utcnow_iso(), "deleted_at": None,
    }
    result = await db.cities.insert_one(doc)
    await audit_log(actor=user, action="city_created", entity_type="city",
                    entity_id=str(result.inserted_id), changed_fields=doc, ip=_client_ip(request))
    return {"ok": True, "id": str(result.inserted_id)}


@router.put("/ref/cities/{city_id}")
async def update_city(city_id: str, payload: CityUpdateIn, request: Request, user: dict = Depends(require_admin)):
    db = get_db()
    existing = await db.cities.find_one({"_id": _oid(city_id), "deleted_at": None})
    if not existing:
        raise HTTPException(status_code=404, detail="City not found")
    update = {"updated_at": utcnow_iso()}
    if payload.name is not None:
        update["name"] = payload.name
    await db.cities.update_one({"_id": existing["_id"]}, {"$set": update})
    await audit_log(actor=user, action="city_updated", entity_type="city",
                    entity_id=city_id, changed_fields=diff_dict(existing, {**existing, **update}, ["name"]),
                    ip=_client_ip(request))
    return {"ok": True}


@router.delete("/ref/cities/{city_id}")
async def delete_city(city_id: str, request: Request, user: dict = Depends(require_admin)):
    db = get_db()
    existing = await db.cities.find_one({"_id": _oid(city_id), "deleted_at": None})
    if not existing:
        raise HTTPException(status_code=404, detail="City not found")
    await db.cities.update_one({"_id": existing["_id"]}, {"$set": {"deleted_at": utcnow_iso()}})
    await audit_log(actor=user, action="city_deleted", entity_type="city",
                    entity_id=city_id, changed_fields={"name": existing["name"]}, ip=_client_ip(request))
    return {"ok": True}


@router.get("/ref/constituencies")
async def list_constituencies(state_id: Optional[str] = None, city_id: Optional[str] = None):
    db = get_db()
    q: dict = dict(NOT_DELETED)
    if state_id:
        q["state_id"] = state_id
    if city_id:
        q["city_id"] = city_id
    docs = await db.constituencies.find(q).sort("name", 1).to_list(5000)
    return {"items": _serialize_list(docs)}


@router.post("/ref/constituencies")
async def create_constituency(payload: ConstituencyIn, request: Request, user: dict = Depends(require_admin)):
    db = get_db()
    state = await db.states.find_one({"_id": _oid(payload.state_id), "deleted_at": None})
    if not state:
        raise HTTPException(status_code=400, detail="Invalid state")
    doc = {
        "state_id": payload.state_id, "city_id": payload.city_id,
        "name": payload.name,
        "created_at": utcnow_iso(), "updated_at": utcnow_iso(), "deleted_at": None,
    }
    result = await db.constituencies.insert_one(doc)
    await audit_log(actor=user, action="constituency_created", entity_type="constituency",
                    entity_id=str(result.inserted_id), changed_fields=doc, ip=_client_ip(request))
    return {"ok": True, "id": str(result.inserted_id)}


@router.put("/ref/constituencies/{cst_id}")
async def update_constituency(cst_id: str, payload: ConstituencyUpdateIn, request: Request, user: dict = Depends(require_admin)):
    db = get_db()
    existing = await db.constituencies.find_one({"_id": _oid(cst_id), "deleted_at": None})
    if not existing:
        raise HTTPException(status_code=404, detail="Constituency not found")
    update = {"updated_at": utcnow_iso()}
    if payload.name is not None:
        update["name"] = payload.name
    if payload.city_id is not None:
        update["city_id"] = payload.city_id
    await db.constituencies.update_one({"_id": existing["_id"]}, {"$set": update})
    await audit_log(actor=user, action="constituency_updated", entity_type="constituency",
                    entity_id=cst_id, changed_fields=diff_dict(existing, {**existing, **update}, ["name", "city_id"]),
                    ip=_client_ip(request))
    return {"ok": True}


@router.delete("/ref/constituencies/{cst_id}")
async def delete_constituency(cst_id: str, request: Request, user: dict = Depends(require_admin)):
    db = get_db()
    existing = await db.constituencies.find_one({"_id": _oid(cst_id), "deleted_at": None})
    if not existing:
        raise HTTPException(status_code=404, detail="Constituency not found")
    await db.constituencies.update_one({"_id": existing["_id"]}, {"$set": {"deleted_at": utcnow_iso()}})
    await audit_log(actor=user, action="constituency_deleted", entity_type="constituency",
                    entity_id=cst_id, changed_fields={"name": existing["name"]}, ip=_client_ip(request))
    return {"ok": True}


# =========================================================================
# POLITICIANS + Relatives + Wealth
# =========================================================================
async def _hydrate_politician(doc: dict) -> dict:
    """Attach relatives + wealth (non-deleted) to a politician."""
    db = get_db()
    d = _serialize(doc)
    d["wealth"] = _serialize_list(
        await db.wealth_entries.find(
            {"politician_id": d["id"], "relative_id": None, "deleted_at": None}
        ).sort("year", 1).to_list(500)
    )
    relatives = await db.relatives.find(
        {"politician_id": d["id"], "deleted_at": None}
    ).to_list(200)
    hydrated_relatives = []
    for r in relatives:
        rs = _serialize(r)
        linked_wealth_source = None
        linked_currency = None
        if rs.get("linked_politician_id"):
            try:
                linked = await db.politicians.find_one(
                    {"_id": _oid(rs["linked_politician_id"]), "deleted_at": None}
                )
            except Exception:
                linked = None
            rs["linked_politician_name"] = linked.get("name") if linked else None
            if linked:
                linked_wealth_source = rs["linked_politician_id"]
                linked_currency = linked.get("currency") or "USD"
        else:
            rs["linked_politician_name"] = None
        if linked_wealth_source:
            rs["wealth"] = _serialize_list(
                await db.wealth_entries.find(
                    {"politician_id": linked_wealth_source, "relative_id": None, "deleted_at": None}
                ).sort("year", 1).to_list(500)
            )
            rs["wealth_currency"] = linked_currency
        else:
            rs["wealth"] = _serialize_list(
                await db.wealth_entries.find(
                    {"relative_id": rs["id"], "deleted_at": None}
                ).sort("year", 1).to_list(500)
            )
            rs["wealth_currency"] = doc.get("currency") or "USD"
        hydrated_relatives.append(rs)
    d["relatives"] = hydrated_relatives
    d["promises"] = _serialize_list(
        await db.promises.find(
            {"politician_id": d["id"], "deleted_at": None}
        ).sort("created_at", -1).to_list(500)
    )
    d["party_history"] = _serialize_list(
        await db.party_history.find(
            {"politician_id": d["id"], "deleted_at": None}
        ).sort("start_date", -1).to_list(200)
    )
    position_docs = await db.position_history.find(
        {"politician_id": d["id"], "deleted_at": None}
    ).sort([("is_current", -1), ("end_date", -1), ("start_date", -1)]).to_list(200)
    hydrated_positions = []
    for pos in position_docs:
        ps = _serialize(pos)
        try:
            ps["country_name"] = None
            if ps.get("country_code"):
                country = await db.countries.find_one({"code": ps["country_code"]})
                ps["country_name"] = country.get("name") if country else None
            ps["state_name"] = None
            if ps.get("state_id"):
                state = await db.states.find_one({"_id": _oid(ps["state_id"])})
                ps["state_name"] = state.get("name") if state else None
            ps["city_name"] = None
            if ps.get("city_id"):
                city = await db.cities.find_one({"_id": _oid(ps["city_id"])})
                ps["city_name"] = city.get("name") if city else None
            ps["constituency_name"] = None
            if ps.get("constituency_id"):
                const = await db.constituencies.find_one({"_id": _oid(ps["constituency_id"])})
                ps["constituency_name"] = const.get("name") if const else None
        except Exception:
            ps.setdefault("country_name", None)
            ps.setdefault("state_name", None)
            ps.setdefault("city_name", None)
            ps.setdefault("constituency_name", None)
        hydrated_positions.append(ps)
    d["position_history"] = hydrated_positions
    d["bio_html"] = doc.get("bio_html") or ""
    d["media"] = _serialize_list(
        await db.politician_media.find(
            {"politician_id": d["id"], "deleted_at": None}
        ).sort("created_at", -1).to_list(200)
    )
    return d


def _strip_private_fields(doc: dict, viewer: Optional[dict]) -> dict:
    """Remove admin-only fields (e.g. gender) unless viewer is admin/super_admin."""
    is_admin = bool(viewer) and viewer.get("role") in ("admin", "super_admin")
    if not is_admin:
        doc.pop("gender", None)
    return doc


_INVERSE_CHILD = {"son": "child", "daughter": "child"}
_INVERSE_PARENT = {"father": "parent", "mother": "parent"}
_INVERSE_SPOUSE = {"husband": "spouse", "wife": "spouse"}
_INVERSE_SIBLING = {"brother": "sibling", "sister": "sibling"}
_INVERSE_GRANDCHILD = {"grandson": "grandchild", "granddaughter": "grandchild"}
_INVERSE_GRANDPARENT = {"grandfather": "grandparent", "grandmother": "grandparent"}


def _gendered(term_male: str, term_female: str, generic: str, gender: Optional[str]) -> str:
    if gender == "male":
        return term_male
    if gender == "female":
        return term_female
    return generic


def _infer_inverse_relationship(relationship: str, original_gender: Optional[str], linked_gender: Optional[str]) -> str:
    """Best-effort inverse of a relationship term. Falls back to a generic term if unknown."""
    rel = (relationship or "").strip().lower()
    if rel in _INVERSE_CHILD:
        return _gendered("father", "mother", "parent", original_gender)
    if rel in _INVERSE_PARENT:
        return _gendered("son", "daughter", "child", linked_gender)
    if rel in _INVERSE_SPOUSE:
        return _gendered("husband", "wife", "spouse", linked_gender)
    if rel in _INVERSE_SIBLING:
        return _gendered("brother", "sister", "sibling", linked_gender)
    if rel in _INVERSE_GRANDCHILD:
        return _gendered("grandfather", "grandmother", "grandparent", original_gender)
    if rel in _INVERSE_GRANDPARENT:
        return _gendered("grandson", "granddaughter", "grandchild", linked_gender)
    if rel == "spouse":
        return "spouse"
    if rel == "sibling":
        return "sibling"
    if rel == "parent":
        return "child"
    if rel == "child":
        return "parent"
    return "relative"


async def _sync_reciprocal_relative(original: dict, pid: str):
    """
    Create, update, or remove the auto-generated reciprocal relative record
    on the linked politician's profile, based on the current state of `original`.
    `original` must be the relative document (with real _id) after the write.
    """
    db = get_db()
    should_have_reciprocal = bool(original.get("is_political")) and bool(original.get("linked_politician_id"))
    reciprocal_id = original.get("reciprocal_relative_id")

    if not should_have_reciprocal:
        if reciprocal_id:
            await db.relatives.update_one({"_id": _oid(reciprocal_id)}, {"$set": {"deleted_at": utcnow_iso()}})
            await db.relatives.update_one({"_id": original["_id"]}, {"$set": {"reciprocal_relative_id": None}})
        return

    linked_pol = await db.politicians.find_one({"_id": _oid(original["linked_politician_id"]), "deleted_at": None})
    if not linked_pol:
        return

    original_pol = await db.politicians.find_one({"_id": _oid(pid), "deleted_at": None})
    original_gender = original_pol.get("gender") if original_pol else None
    linked_gender = linked_pol.get("gender")
    inverse_relationship = _infer_inverse_relationship(original.get("relationship"), original_gender, linked_gender)

    reciprocal_fields = {
        "politician_id": str(original["linked_politician_id"]),
        "name": original_pol.get("name") if original_pol else "",
        "relationship": inverse_relationship,
        "description": None,
        "is_political": True,
        "political_role": (original_pol.get("role") if original_pol else None),
        "linked_politician_id": pid,
        "is_reciprocal": True,
        "reciprocal_of": str(original["_id"]),
        "updated_at": utcnow_iso(),
    }

    existing_reciprocal = await db.relatives.find_one({"_id": _oid(reciprocal_id), "deleted_at": None}) if reciprocal_id else None

    if existing_reciprocal:
        await db.relatives.update_one({"_id": existing_reciprocal["_id"]}, {"$set": reciprocal_fields})
    else:
        reciprocal_fields["created_at"] = utcnow_iso()
        reciprocal_fields["deleted_at"] = None
        result = await db.relatives.insert_one(reciprocal_fields)
        await db.relatives.update_one({"_id": original["_id"]}, {"$set": {"reciprocal_relative_id": str(result.inserted_id)}})


@router.get("/politicians")
async def list_politicians(
    q: Optional[str] = None,
    country_code: Optional[str] = None,
    state_id: Optional[str] = None,
    constituency_id: Optional[str] = None,
    limit: int = 10000000,
    user: Optional[dict] = Depends(get_current_user_optional),
):
    db = get_db()
    query: dict = dict(NOT_DELETED)
    if q:
        query["name"] = {"$regex": re.escape(q), "$options": "i"}
    if country_code:
        query["country_code"] = country_code
    if state_id:
        query["state_id"] = state_id
    if constituency_id:
        query["constituency_id"] = constituency_id
    docs = await db.politicians.find(query).sort("name", 1).limit(limit).to_list(limit)
    items = [_strip_private_fields(d, user) for d in _serialize_list(docs)]
    return {"items": items}


# ---------- Site Stats ----------
@router.get("/stats")
async def site_stats():
    db = get_db()
    total_politicians = await db.politicians.count_documents({"deleted_at": None})
    total_promises = await db.promises.count_documents({"deleted_at": None})
    total_delivered = await db.promises.count_documents({"status": "delivered", "deleted_at": None})
    total_broken = await db.promises.count_documents({"status": "broken", "deleted_at": None})
    delivered_pct = round((total_delivered / total_promises) * 100, 1) if total_promises else 0
    broken_pct = round((total_broken / total_promises) * 100, 1) if total_promises else 0
    return {
        "total_politicians": total_politicians,
        "total_promises": total_promises,
        "total_delivered": total_delivered,
        "total_broken": total_broken,
        "delivered_pct": delivered_pct,
        "broken_pct": broken_pct,
    }


# ---------- Bulk Import / Export ----------
_CSV_COLUMNS = [
    "name", "party", "role", "brief_intro", "country_code", "state", "city", "constituency",
    "date_of_birth", "education", "profession", "contact_email", "contact_phone",
    "official_website", "social_twitter", "social_facebook", "social_instagram", "social_youtube", "tags",
]


@router.get("/politicians/import-template")
async def download_import_template(user: dict = Depends(require_admin)):
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(_CSV_COLUMNS)
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=politician_import_template.csv"},
    )


@router.get("/politicians/export")
async def export_politicians(user: dict = Depends(require_admin)):
    db = get_db()
    docs = await db.politicians.find(NOT_DELETED).sort("name", 1).to_list(100000)
    state_cache, city_cache, const_cache = {}, {}, {}

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(_CSV_COLUMNS)

    for doc in docs:
        state_name = ""
        if doc.get("state_id"):
            if doc["state_id"] not in state_cache:
                s = await db.states.find_one({"_id": _oid(doc["state_id"])})
                state_cache[doc["state_id"]] = s.get("name") if s else ""
            state_name = state_cache[doc["state_id"]]
        city_name = ""
        if doc.get("city_id"):
            if doc["city_id"] not in city_cache:
                c = await db.cities.find_one({"_id": _oid(doc["city_id"])})
                city_cache[doc["city_id"]] = c.get("name") if c else ""
            city_name = city_cache[doc["city_id"]]
        const_name = ""
        if doc.get("constituency_id"):
            if doc["constituency_id"] not in const_cache:
                k = await db.constituencies.find_one({"_id": _oid(doc["constituency_id"])})
                const_cache[doc["constituency_id"]] = k.get("name") if k else ""
            const_name = const_cache[doc["constituency_id"]]

        social = doc.get("social_links") or {}
        writer.writerow([
            doc.get("name", ""), doc.get("party", ""), doc.get("role", ""), doc.get("brief_intro", ""),
            doc.get("country_code", ""), state_name, city_name, const_name,
            doc.get("date_of_birth", ""), doc.get("education", ""), doc.get("profession", ""),
            doc.get("contact_email", ""), doc.get("contact_phone", ""), doc.get("official_website", ""),
            social.get("twitter", ""), social.get("facebook", ""), social.get("instagram", ""), social.get("youtube", ""),
            ";".join(doc.get("tags", [])),
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=politicians_export.csv"},
    )


@router.post("/politicians/import")
async def import_politicians(request: Request, file: UploadFile = File(...), user: dict = Depends(require_admin)):
    db = get_db()
    raw = await file.read()
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File must be UTF-8 encoded CSV")

    reader = csv.DictReader(io.StringIO(text))
    missing_cols = [c for c in ["name", "country_code"] if c not in (reader.fieldnames or [])]
    if missing_cols:
        raise HTTPException(status_code=400, detail=f"Missing required column(s): {', '.join(missing_cols)}")

    created = 0
    errors = []
    skipped = []
    state_lookup, city_lookup, const_lookup = {}, {}, {}

    for i, row in enumerate(reader, start=2):
        name = (row.get("name") or "").strip()
        country_code = (row.get("country_code") or "").strip().upper()
        if not name:
            errors.append({"row": i, "error": "Missing name"})
            continue
        if not country_code:
            errors.append({"row": i, "error": "Missing country_code"})
            continue

        country = await db.countries.find_one({"code": country_code})
        if not country:
            errors.append({"row": i, "error": f"Unknown country_code '{country_code}'"})
            continue

        state_id = None
        state_name = (row.get("state") or "").strip()
        if state_name:
            cache_key = (country_code, state_name.lower())
            if cache_key not in state_lookup:
                existing_state = await db.states.find_one(
                    {"country_code": country_code, "name": {"$regex": f"^{re.escape(state_name)}$", "$options": "i"}}
                )
                if existing_state:
                    state_lookup[cache_key] = str(existing_state["_id"])
                else:
                    result = await db.states.insert_one({
                        "name": state_name, "country_code": country_code,
                        "created_at": utcnow_iso(), "updated_at": utcnow_iso(), "deleted_at": None,
                    })
                    state_lookup[cache_key] = str(result.inserted_id)
            state_id = state_lookup[cache_key]

        city_id = None
        city_name = (row.get("city") or "").strip()
        if city_name and state_id:
            cache_key = (state_id, city_name.lower())
            if cache_key not in city_lookup:
                existing_city = await db.cities.find_one(
                    {"state_id": state_id, "name": {"$regex": f"^{re.escape(city_name)}$", "$options": "i"}}
                )
                if existing_city:
                    city_lookup[cache_key] = str(existing_city["_id"])
                else:
                    result = await db.cities.insert_one({
                        "name": city_name, "state_id": state_id,
                        "created_at": utcnow_iso(), "updated_at": utcnow_iso(), "deleted_at": None,
                    })
                    city_lookup[cache_key] = str(result.inserted_id)
            city_id = city_lookup[cache_key]

        constituency_id = None
        const_name = (row.get("constituency") or "").strip()
        if const_name and state_id:
            cache_key = (state_id, const_name.lower())
            if cache_key not in const_lookup:
                existing_const = await db.constituencies.find_one(
                    {"state_id": state_id, "name": {"$regex": f"^{re.escape(const_name)}$", "$options": "i"}}
                )
                if existing_const:
                    const_lookup[cache_key] = str(existing_const["_id"])
                else:
                    result = await db.constituencies.insert_one({
                        "name": const_name, "state_id": state_id,
                        "created_at": utcnow_iso(), "updated_at": utcnow_iso(), "deleted_at": None,
                    })
                    const_lookup[cache_key] = str(result.inserted_id)
            constituency_id = const_lookup[cache_key]

        tags_raw = (row.get("tags") or "").strip()
        tags = [t.strip() for t in tags_raw.split(";") if t.strip()] if tags_raw else []

        social_links = {
            "twitter": (row.get("social_twitter") or "").strip() or None,
            "facebook": (row.get("social_facebook") or "").strip() or None,
            "instagram": (row.get("social_instagram") or "").strip() or None,
            "youtube": (row.get("social_youtube") or "").strip() or None,
        }
        if not any(social_links.values()):
            social_links = None

        doc = {
            "name": name,
            "party": (row.get("party") or "").strip() or None,
            "role": (row.get("role") or "").strip() or None,
            "brief_intro": (row.get("brief_intro") or "").strip() or None,
            "image_url": None,
            "country_code": country_code,
            "state_id": state_id,
            "city_id": city_id,
            "constituency_id": constituency_id,
            "date_of_birth": (row.get("date_of_birth") or "").strip() or None,
            "education": (row.get("education") or "").strip() or None,
            "profession": (row.get("profession") or "").strip() or None,
            "contact_email": (row.get("contact_email") or "").strip() or None,
            "contact_phone": (row.get("contact_phone") or "").strip() or None,
            "official_website": (row.get("official_website") or "").strip() or None,
            "social_links": social_links,
            "tags": tags,
            "created_at": utcnow_iso(), "updated_at": utcnow_iso(), "deleted_at": None,
        }

        existing_politician = await db.politicians.find_one({
            "name": {"$regex": f"^{re.escape(name)}$", "$options": "i"},
            "country_code": country_code,
            "deleted_at": None,
        })
        if existing_politician:
            skipped.append({"row": i, "name": name, "reason": "Politician with this name and country already exists"})
            continue

        try:
            result = await db.politicians.insert_one(doc)
            created += 1
            await audit_log(actor=user, action="politician_imported", entity_type="politician",
                            entity_id=str(result.inserted_id), changed_fields={"name": name, "source": "csv_import"},
                            ip=_client_ip(request))
        except Exception as e:
            errors.append({"row": i, "error": f"Database error: {str(e)}"})

    return {"created": created, "skipped": skipped, "errors": errors}


# ---------- Wealth entries (politician-level or relative-level) ----------


@router.get("/politicians/{pid}")
async def get_politician(pid: str, user: Optional[dict] = Depends(get_current_user_optional)):
    db = get_db()
    doc = await db.politicians.find_one({"_id": _oid(pid), "deleted_at": None})
    if not doc:
        raise HTTPException(status_code=404, detail="Politician not found")
    hydrated = await _hydrate_politician(doc)
    return _strip_private_fields(hydrated, user)


@router.get("/admin/politicians")
async def list_politicians_admin(
    q: Optional[str] = None,
    country_code: Optional[str] = None,
    state_id: Optional[str] = None,
    constituency_id: Optional[str] = None,
    limit: int = 10000000,
    user: dict = Depends(require_section("politicians")),
):
    db = get_db()
    query: dict = dict(NOT_DELETED)
    if q:
        query["name"] = {"$regex": re.escape(q), "$options": "i"}
    if country_code:
        query["country_code"] = country_code
    if state_id:
        query["state_id"] = state_id
    if constituency_id:
        query["constituency_id"] = constituency_id
    scope_filter = geo_scope_mongo_filter(user)
    if scope_filter:
        query = {"$and": [query, scope_filter]}
    docs = await db.politicians.find(query).sort("name", 1).limit(limit).to_list(limit)
    return {"items": _serialize_list(docs)}


@router.get("/admin/politicians/{pid}")
async def get_politician_admin(pid: str, user: dict = Depends(require_section("politicians"))):
    db = get_db()
    doc = await db.politicians.find_one({"_id": _oid(pid), "deleted_at": None})
    if not doc:
        raise HTTPException(status_code=404, detail="Politician not found")
    if not can_access_politician(user, doc):
        raise HTTPException(status_code=403, detail="No access to this politician's region")
    hydrated = await _hydrate_politician(doc)
    return hydrated


@router.post("/politicians")
async def create_politician(payload: PoliticianIn, request: Request, user: dict = Depends(require_section("politicians"))):
    db = get_db()
    doc = payload.model_dump()
    if not can_access_politician(user, doc):
        raise HTTPException(status_code=403, detail="Cannot create a politician outside your assigned region")
    doc.update({"created_at": utcnow_iso(), "updated_at": utcnow_iso(), "deleted_at": None})
    result = await db.politicians.insert_one(doc)
    await audit_log(actor=user, action="politician_created", entity_type="politician",
                    entity_id=str(result.inserted_id), changed_fields={"name": payload.name},
                    ip=_client_ip(request))
    return {"ok": True, "id": str(result.inserted_id)}


@router.put("/politicians/{pid}")
async def update_politician(pid: str, payload: PoliticianUpdateIn, request: Request, user: dict = Depends(require_section("politicians"))):
    db = get_db()
    existing = await db.politicians.find_one({"_id": _oid(pid), "deleted_at": None})
    if not existing:
        raise HTTPException(status_code=404, detail="Not found")
    if not can_access_politician(user, existing):
        raise HTTPException(status_code=403, detail="No access to this politician's region")
    update_data = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    update_data["updated_at"] = utcnow_iso()

    new_party = update_data.get("party")
    if new_party and new_party != existing.get("party"):
        today = utcnow_iso()[:10]
        await db.party_history.update_many(
            {"politician_id": pid, "end_date": None, "deleted_at": None},
            {"$set": {"end_date": today, "updated_at": utcnow_iso()}}
        )
        await db.party_history.insert_one({
            "politician_id": pid,
            "party": new_party,
            "start_date": today,
            "end_date": None,
            "note": "Party change (auto-logged)",
            "source_url": None,
            "created_at": utcnow_iso(), "updated_at": utcnow_iso(), "deleted_at": None,
        })

    await db.politicians.update_one({"_id": existing["_id"]}, {"$set": update_data})
    changed = diff_dict(existing, {**existing, **update_data}, list(update_data.keys()))
    await audit_log(actor=user, action="politician_updated", entity_type="politician",
                    entity_id=pid, changed_fields=changed, ip=_client_ip(request))
    return {"ok": True}


@router.delete("/politicians/{pid}")
async def delete_politician(pid: str, request: Request, user: dict = Depends(require_section("politicians"))):
    db = get_db()
    existing = await db.politicians.find_one({"_id": _oid(pid), "deleted_at": None})
    if not existing:
        raise HTTPException(status_code=404, detail="Not found")
    if not can_access_politician(user, existing):
        raise HTTPException(status_code=403, detail="No access to this politician's region")
    now = utcnow_iso()
    await db.politicians.update_one({"_id": existing["_id"]}, {"$set": {"deleted_at": now}})
    await audit_log(actor=user, action="politician_deleted", entity_type="politician",
                    entity_id=pid, changed_fields={"name": existing["name"]}, ip=_client_ip(request))
    return {"ok": True}


@router.post("/politicians/{pid}/wealth")
async def add_politician_wealth(pid: str, payload: WealthEntryIn, request: Request, user: dict = Depends(require_admin)):
    db = get_db()
    politician = await db.politicians.find_one({"_id": _oid(pid), "deleted_at": None})
    if not politician:
        raise HTTPException(status_code=404, detail="Politician not found")
    net_worth = payload.net_worth if payload.net_worth is not None else payload.assets - payload.liabilities
    doc = {
        "politician_id": pid, "relative_id": None,
        "year": payload.year, "assets": payload.assets, "liabilities": payload.liabilities,
        "net_worth": net_worth, "notes": payload.notes,
        "source_urls": payload.source_urls,
        "created_at": utcnow_iso(), "updated_at": utcnow_iso(), "deleted_at": None,
    }
    result = await db.wealth_entries.insert_one(doc)
    await audit_log(actor=user, action="wealth_created", entity_type="wealth",
                    entity_id=str(result.inserted_id),
                    changed_fields={"politician_id": pid, "year": payload.year, "net_worth": net_worth},
                    ip=_client_ip(request))
    return {"ok": True, "id": str(result.inserted_id)}


@router.put("/wealth/{wid}")
async def update_wealth(wid: str, payload: WealthEntryIn, request: Request, user: dict = Depends(require_admin)):
    db = get_db()
    existing = await db.wealth_entries.find_one({"_id": _oid(wid), "deleted_at": None})
    if not existing:
        raise HTTPException(status_code=404, detail="Wealth entry not found")
    net_worth = payload.net_worth if payload.net_worth is not None else payload.assets - payload.liabilities
    update = {
        "year": payload.year, "assets": payload.assets, "liabilities": payload.liabilities,
        "net_worth": net_worth, "notes": payload.notes, "source_urls": payload.source_urls,
        "updated_at": utcnow_iso(),
    }
    await db.wealth_entries.update_one({"_id": existing["_id"]}, {"$set": update})
    await audit_log(actor=user, action="wealth_updated", entity_type="wealth",
                    entity_id=wid, changed_fields=diff_dict(existing, {**existing, **update},
                    ["year", "assets", "liabilities", "net_worth", "notes"]),
                    ip=_client_ip(request))
    return {"ok": True}


@router.delete("/wealth/{wid}")
async def delete_wealth(wid: str, request: Request, user: dict = Depends(require_admin)):
    db = get_db()
    existing = await db.wealth_entries.find_one({"_id": _oid(wid), "deleted_at": None})
    if not existing:
        raise HTTPException(status_code=404, detail="Not found")
    await db.wealth_entries.update_one({"_id": existing["_id"]}, {"$set": {"deleted_at": utcnow_iso()}})
    await audit_log(actor=user, action="wealth_deleted", entity_type="wealth",
                    entity_id=wid, changed_fields={"year": existing.get("year")}, ip=_client_ip(request))
    return {"ok": True}


# ---------- Relatives ----------
@router.post("/politicians/{pid}/relatives")
async def add_relative(pid: str, payload: RelativeIn, request: Request, user: dict = Depends(require_admin)):
    db = get_db()
    politician = await db.politicians.find_one({"_id": _oid(pid), "deleted_at": None})
    if not politician:
        raise HTTPException(status_code=404, detail="Politician not found")
    doc = {
        "politician_id": pid, "name": payload.name,
        "relationship": payload.relationship, "description": payload.description,
        "is_political": payload.is_political, "political_role": payload.political_role,
        "linked_politician_id": payload.linked_politician_id,
        "is_reciprocal": False, "reciprocal_of": None, "reciprocal_relative_id": None,
        "created_at": utcnow_iso(), "updated_at": utcnow_iso(), "deleted_at": None,
    }
    result = await db.relatives.insert_one(doc)
    doc["_id"] = result.inserted_id
    await _sync_reciprocal_relative(doc, pid)
    await audit_log(actor=user, action="relative_created", entity_type="relative",
                    entity_id=str(result.inserted_id),
                    changed_fields={"politician_id": pid, "name": payload.name}, ip=_client_ip(request))
    return {"ok": True, "id": str(result.inserted_id)}


@router.put("/relatives/{rid}")
async def update_relative(rid: str, payload: RelativeIn, request: Request, user: dict = Depends(require_admin)):
    db = get_db()
    existing = await db.relatives.find_one({"_id": _oid(rid), "deleted_at": None})
    if not existing:
        raise HTTPException(status_code=404, detail="Relative not found")
    if existing.get("is_reciprocal"):
        raise HTTPException(status_code=400, detail="This entry is auto-linked. Edit it from the original politician's profile instead.")
    update = payload.model_dump()
    update["updated_at"] = utcnow_iso()
    await db.relatives.update_one({"_id": existing["_id"]}, {"$set": update})
    merged = {**existing, **update}
    await _sync_reciprocal_relative(merged, existing["politician_id"])
    await audit_log(actor=user, action="relative_updated", entity_type="relative",
                    entity_id=rid, changed_fields=diff_dict(existing, merged,
                    ["name", "relationship", "description", "is_political", "political_role", "linked_politician_id"]), ip=_client_ip(request))
    return {"ok": True}


@router.delete("/relatives/{rid}")
async def delete_relative(rid: str, request: Request, user: dict = Depends(require_admin)):
    db = get_db()
    existing = await db.relatives.find_one({"_id": _oid(rid), "deleted_at": None})
    if not existing:
        raise HTTPException(status_code=404, detail="Not found")
    if existing.get("is_reciprocal"):
        raise HTTPException(status_code=400, detail="This entry is auto-linked. Delete it from the original politician's profile instead.")
    await db.relatives.update_one({"_id": existing["_id"]}, {"$set": {"deleted_at": utcnow_iso()}})
    reciprocal_id = existing.get("reciprocal_relative_id")
    if reciprocal_id:
        await db.relatives.update_one({"_id": _oid(reciprocal_id)}, {"$set": {"deleted_at": utcnow_iso()}})
    await audit_log(actor=user, action="relative_deleted", entity_type="relative",
                    entity_id=rid, changed_fields={"name": existing["name"]}, ip=_client_ip(request))
    return {"ok": True}


@router.post("/relatives/{rid}/wealth")
async def add_relative_wealth(rid: str, payload: WealthEntryIn, request: Request, user: dict = Depends(require_admin)):
    db = get_db()
    rel = await db.relatives.find_one({"_id": _oid(rid), "deleted_at": None})
    if not rel:
        raise HTTPException(status_code=404, detail="Relative not found")
    net_worth = payload.net_worth if payload.net_worth is not None else payload.assets - payload.liabilities
    doc = {
        "politician_id": rel["politician_id"], "relative_id": rid,
        "year": payload.year, "assets": payload.assets, "liabilities": payload.liabilities,
        "net_worth": net_worth, "notes": payload.notes, "source_urls": payload.source_urls,
        "created_at": utcnow_iso(), "updated_at": utcnow_iso(), "deleted_at": None,
    }
    result = await db.wealth_entries.insert_one(doc)
    await audit_log(actor=user, action="relative_wealth_created", entity_type="wealth",
                    entity_id=str(result.inserted_id),
                    changed_fields={"relative_id": rid, "year": payload.year}, ip=_client_ip(request))
    return {"ok": True, "id": str(result.inserted_id)}


    d["relatives"] = hydrated_relatives
    d["promises"] = _serialize_list(
        await db.promises.find(
            {"politician_id": d["id"], "deleted_at": None}
        ).sort("created_at", -1).to_list(500)
    )
    return d

# ---------- Promises ----------
@router.get("/politicians/{pid}/promises")
async def list_promises(pid: str):
    db = get_db()
    docs = await db.promises.find(
        {"politician_id": pid, "deleted_at": None}
    ).sort("created_at", -1).to_list(500)
    return _serialize_list(docs)


@router.post("/politicians/{pid}/promises")
async def add_promise(pid: str, payload: PromiseIn, request: Request, user: dict = Depends(require_admin)):
    db = get_db()
    politician = await db.politicians.find_one({"_id": _oid(pid), "deleted_at": None})
    if not politician:
        raise HTTPException(status_code=404, detail="Politician not found")
    doc = {
        "politician_id": pid,
        "title": payload.title,
        "description": payload.description,
        "status": payload.status,
        "date_made": payload.date_made,
        "source_url": payload.source_url,
        "created_by": user["_id"],
        "created_by_name": user.get("name") or user.get("email", "Unknown"),
        "created_at": utcnow_iso(), "updated_at": utcnow_iso(), "deleted_at": None,
    }
    result = await db.promises.insert_one(doc)
    await audit_log(actor=user, action="promise_created", entity_type="promise",
                    entity_id=str(result.inserted_id),
                    changed_fields={"politician_id": pid, "title": payload.title},
                    ip=_client_ip(request))
    return {"ok": True, "id": str(result.inserted_id)}


@router.put("/promises/{prid}")
async def update_promise(prid: str, payload: PromiseUpdateIn, request: Request, user: dict = Depends(require_authenticated)):
    db = get_db()
    existing = await db.promises.find_one({"_id": _oid(prid), "deleted_at": None})
    if not existing:
        raise HTTPException(status_code=404, detail="Promise not found")
    is_owner = existing.get("created_by") == user["_id"]
    is_admin = user.get("role") in ("admin", "super_admin")
    if not (is_owner or is_admin):
        raise HTTPException(status_code=403, detail="Not authorized to edit this promise")
    update = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    update["updated_at"] = utcnow_iso()
    await db.promises.update_one({"_id": existing["_id"]}, {"$set": update})
    await audit_log(actor=user, action="promise_updated", entity_type="promise",
                    entity_id=prid,
                    changed_fields=diff_dict(existing, {**existing, **update}, list(update.keys())),
                    ip=_client_ip(request))
    return {"ok": True}


@router.delete("/promises/{prid}")
async def delete_promise(prid: str, request: Request, user: dict = Depends(require_authenticated)):
    db = get_db()
    existing = await db.promises.find_one({"_id": _oid(prid), "deleted_at": None})
    if not existing:
        raise HTTPException(status_code=404, detail="Not found")
    is_owner = existing.get("created_by") == user["_id"]
    is_admin = user.get("role") in ("admin", "super_admin")
    if not (is_owner or is_admin):
        raise HTTPException(status_code=403, detail="Not authorized to delete this promise")
    await db.promises.update_one({"_id": existing["_id"]}, {"$set": {"deleted_at": utcnow_iso()}})
    await audit_log(actor=user, action="promise_deleted", entity_type="promise",
                    entity_id=prid, changed_fields={"title": existing.get("title")},
                    ip=_client_ip(request))
    return {"ok": True}


# ---------- Party History ----------
@router.get("/politicians/{pid}/party-history")
async def list_party_history(pid: str):
    db = get_db()
    docs = await db.party_history.find(
        {"politician_id": pid, "deleted_at": None}
    ).sort("start_date", -1).to_list(200)
    return _serialize_list(docs)


@router.post("/politicians/{pid}/party-history")
async def add_party_history(pid: str, payload: PartyHistoryIn, request: Request, user: dict = Depends(require_admin)):
    db = get_db()
    politician = await db.politicians.find_one({"_id": _oid(pid), "deleted_at": None})
    if not politician:
        raise HTTPException(status_code=404, detail="Politician not found")
    doc = {
        "politician_id": pid,
        "party": payload.party,
        "start_date": payload.start_date,
        "end_date": payload.end_date,
        "note": payload.note,
        "source_url": payload.source_url,
        "created_at": utcnow_iso(), "updated_at": utcnow_iso(), "deleted_at": None,
    }
    result = await db.party_history.insert_one(doc)
    await audit_log(actor=user, action="party_history_created", entity_type="party_history",
                    entity_id=str(result.inserted_id),
                    changed_fields={"politician_id": pid, "party": payload.party}, ip=_client_ip(request))
    return {"ok": True, "id": str(result.inserted_id)}


@router.put("/party-history/{phid}")
async def update_party_history(phid: str, payload: PartyHistoryUpdateIn, request: Request, user: dict = Depends(require_admin)):
    db = get_db()
    existing = await db.party_history.find_one({"_id": _oid(phid), "deleted_at": None})
    if not existing:
        raise HTTPException(status_code=404, detail="Party history entry not found")
    update = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    update["updated_at"] = utcnow_iso()
    await db.party_history.update_one({"_id": existing["_id"]}, {"$set": update})
    await audit_log(actor=user, action="party_history_updated", entity_type="party_history",
                    entity_id=phid, changed_fields=diff_dict(existing, {**existing, **update}, list(update.keys())),
                    ip=_client_ip(request))
    return {"ok": True}


@router.delete("/party-history/{phid}")
async def delete_party_history(phid: str, request: Request, user: dict = Depends(require_admin)):
    db = get_db()
    existing = await db.party_history.find_one({"_id": _oid(phid), "deleted_at": None})
    if not existing:
        raise HTTPException(status_code=404, detail="Not found")
    await db.party_history.update_one({"_id": existing["_id"]}, {"$set": {"deleted_at": utcnow_iso()}})
    await audit_log(actor=user, action="party_history_deleted", entity_type="party_history",
                    entity_id=phid, changed_fields={"party": existing.get("party")}, ip=_client_ip(request))
    return {"ok": True}


# ---------- Position History ----------
@router.get("/politicians/{pid}/position-history")
async def list_position_history(pid: str):
    db = get_db()
    docs = await db.position_history.find(
        {"politician_id": pid, "deleted_at": None}
    ).sort([("is_current", -1), ("end_date", -1), ("start_date", -1)]).to_list(200)
    return _serialize_list(docs)


@router.post("/politicians/{pid}/position-history")
async def add_position_history(pid: str, payload: PositionHistoryIn, request: Request, user: dict = Depends(require_admin)):
    db = get_db()
    politician = await db.politicians.find_one({"_id": _oid(pid), "deleted_at": None})
    if not politician:
        raise HTTPException(status_code=404, detail="Politician not found")
    doc = {
        "politician_id": pid,
        "position": payload.position,
        "country_code": payload.country_code,
        "state_id": payload.state_id,
        "city_id": payload.city_id,
        "constituency_id": payload.constituency_id,
        "party": payload.party,
        "start_date": payload.start_date,
        "end_date": payload.end_date,
        "is_current": payload.is_current,
        "election_year": payload.election_year,
        "note": payload.note,
        "created_at": utcnow_iso(), "updated_at": utcnow_iso(), "deleted_at": None,
    }
    result = await db.position_history.insert_one(doc)
    await audit_log(actor=user, action="position_history_created", entity_type="position_history",
                    entity_id=str(result.inserted_id),
                    changed_fields={"politician_id": pid, "position": payload.position}, ip=_client_ip(request))
    return {"ok": True, "id": str(result.inserted_id)}


@router.put("/position-history/{phid}")
async def update_position_history(phid: str, payload: PositionHistoryUpdateIn, request: Request, user: dict = Depends(require_admin)):
    db = get_db()
    existing = await db.position_history.find_one({"_id": _oid(phid), "deleted_at": None})
    if not existing:
        raise HTTPException(status_code=404, detail="Position history entry not found")
    update = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    update["updated_at"] = utcnow_iso()
    await db.position_history.update_one({"_id": existing["_id"]}, {"$set": update})
    await audit_log(actor=user, action="position_history_updated", entity_type="position_history",
                    entity_id=phid, changed_fields=diff_dict(existing, {**existing, **update}, list(update.keys())),
                    ip=_client_ip(request))
    return {"ok": True}


@router.delete("/position-history/{phid}")
async def delete_position_history(phid: str, request: Request, user: dict = Depends(require_admin)):
    db = get_db()
    existing = await db.position_history.find_one({"_id": _oid(phid), "deleted_at": None})
    if not existing:
        raise HTTPException(status_code=404, detail="Not found")
    await db.position_history.update_one({"_id": existing["_id"]}, {"$set": {"deleted_at": utcnow_iso()}})
    await audit_log(actor=user, action="position_history_deleted", entity_type="position_history",
                    entity_id=phid, changed_fields={"position": existing.get("position")}, ip=_client_ip(request))
    return {"ok": True}


# ---------- Bio / Media ----------
_ALLOWED_TAGS = [
    "p", "br", "strong", "b", "em", "i", "u", "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li", "a", "img", "blockquote", "hr", "table", "thead", "tbody",
    "tr", "th", "td", "span", "div", "figure", "figcaption", "video", "source",
    "sup", "sub",
]
_ALLOWED_ATTRS = {
    "a": ["href", "title", "target", "rel"],
    "img": ["src", "alt", "title", "width", "height"],
    "video": ["src", "controls", "width", "height"],
    "source": ["src", "type"],
    "*": ["class"],
}

_DANGEROUS_ATTR_PREFIX = "on"

def _sanitize_full_document_html(raw: str) -> str:
    raw = raw or ""
    soup = BeautifulSoup(raw, "html.parser")
    for tag in soup(["script"]):
        tag.decompose()
    for tag in soup.find_all(True):
        for attr in list(tag.attrs.keys()):
            if attr.lower().startswith(_DANGEROUS_ATTR_PREFIX):
                del tag.attrs[attr]
        for url_attr in ("href", "src", "action"):
            val = tag.attrs.get(url_attr)
            if val and re.match(r"^\s*javascript:", val, re.IGNORECASE):
                del tag.attrs[url_attr]
    return str(soup)

def _sanitize_html(raw: str) -> str:
    raw = raw or ""

    # If it's a full document (has <html>/<head>/<body>), extract just the
    # body content and drop <script>/<style>/<title> entirely — tag AND text —
    # before bleach ever sees them. bleach only strips tags, not their text,
    # so a raw <style> block would otherwise leak as visible CSS text.
    soup = BeautifulSoup(raw, "html.parser")
    for tag in soup(["script", "style", "head", "title"]):
        tag.decompose()

    body = soup.body
    fragment = body.decode_contents() if body else str(soup)

    return bleach.clean(
        fragment,
        tags=_ALLOWED_TAGS,
        attributes=_ALLOWED_ATTRS,
        protocols=["http", "https", "mailto"],
        strip=True,
    )


@router.put("/politicians/{pid}/bio")
async def update_bio(pid: str, payload: BioIn, request: Request, user: dict = Depends(require_admin)):
    db = get_db()
    politician = await db.politicians.find_one({"_id": _oid(pid), "deleted_at": None})
    if not politician:
        raise HTTPException(status_code=404, detail="Politician not found")
    clean_html = _sanitize_html(payload.html)
    await db.politicians.update_one({"_id": politician["_id"]}, {"$set": {"bio_html": clean_html, "updated_at": utcnow_iso()}})
    await audit_log(actor=user, action="bio_updated", entity_type="politician",
                    entity_id=pid, changed_fields={"bio_length": len(clean_html)}, ip=_client_ip(request))
    return {"ok": True}


@router.post("/politicians/{pid}/bio-file")
async def upload_bio_file(pid: str, request: Request, file: UploadFile = File(...), user: dict = Depends(require_admin)):
    db = get_db()
    politician = await db.politicians.find_one({"_id": _oid(pid), "deleted_at": None})
    if not politician:
        raise HTTPException(status_code=404, detail="Politician not found")
    if not file.filename.lower().endswith((".html", ".htm")):
        raise HTTPException(status_code=400, detail="Only .html files are accepted here")
    raw = await file.read()
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File must be UTF-8 encoded HTML")
    clean_html = _sanitize_full_document_html(text)
    await db.politicians.update_one({"_id": politician["_id"]}, {"$set": {"bio_html": clean_html, "updated_at": utcnow_iso()}})
    await audit_log(actor=user, action="bio_file_uploaded", entity_type="politician",
                    entity_id=pid, changed_fields={"filename": file.filename}, ip=_client_ip(request))
    return {"ok": True}


def _media_type_for(content_type: str) -> str:
    if not content_type:
        return "other"
    if content_type.startswith("image/"):
        return "image"
    if content_type == "application/pdf":
        return "pdf"
    if content_type.startswith("video/"):
        return "video"
    return "other"


@router.get("/politicians/{pid}/media")
async def list_media(pid: str):
    db = get_db()
    docs = await db.politician_media.find(
        {"politician_id": pid, "deleted_at": None}
    ).sort("created_at", -1).to_list(200)
    return _serialize_list(docs)


@router.post("/politicians/{pid}/media")
async def upload_media(pid: str, request: Request, file: UploadFile = File(...), user: dict = Depends(require_admin)):
    db = get_db()
    politician = await db.politicians.find_one({"_id": _oid(pid), "deleted_at": None})
    if not politician:
        raise HTTPException(status_code=404, detail="Politician not found")
    url = await UploadService.save(file, subdir="politician_media")
    doc = {
        "politician_id": pid,
        "url": url,
        "filename": file.filename,
        "file_type": _media_type_for(file.content_type),
        "uploaded_by": user.get("email") or user.get("_id"),
        "created_at": utcnow_iso(), "updated_at": utcnow_iso(), "deleted_at": None,
    }
    result = await db.politician_media.insert_one(doc)
    await audit_log(actor=user, action="media_uploaded", entity_type="politician_media",
                    entity_id=str(result.inserted_id), changed_fields={"filename": file.filename}, ip=_client_ip(request))
    return {"ok": True, "id": str(result.inserted_id), "url": url}


@router.delete("/media/{mid}")
async def delete_media(mid: str, request: Request, user: dict = Depends(require_admin)):
    db = get_db()
    existing = await db.politician_media.find_one({"_id": _oid(mid), "deleted_at": None})
    if not existing:
        raise HTTPException(status_code=404, detail="Not found")
    await db.politician_media.update_one({"_id": existing["_id"]}, {"$set": {"deleted_at": utcnow_iso()}})
    await audit_log(actor=user, action="media_deleted", entity_type="politician_media",
                    entity_id=mid, changed_fields={"filename": existing.get("filename")}, ip=_client_ip(request))
    return {"ok": True}


# =========================================================================
# COMMUNITY DESK: Contact Us + Submit an Update + Visitor CRM
# =========================================================================
async def _next_ticket_number(db, prefix: str) -> str:
    counter = await db.counters.find_one_and_update(
        {"_id": f"ticket_{prefix}"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True,
    )
    return f"{prefix}-{1000 + counter['seq']}"


async def _upsert_visitor(db, *, first_name: str, last_name: str, email: str, country_code: Optional[str], organization: Optional[str] = None):
    email_norm = email.strip().lower()
    existing = await db.visitors.find_one({"email": email_norm})
    now = utcnow_iso()
    if existing:
        await db.visitors.update_one(
            {"_id": existing["_id"]},
            {"$set": {"last_contact_date": now}, "$inc": {"ticket_count": 1}}
        )
        return str(existing["_id"])
    doc = {
        "first_name": first_name, "last_name": last_name, "email": email_norm,
        "country_code": country_code, "organization": organization,
        "first_contact_date": now, "last_contact_date": now,
        "ticket_count": 1, "approved_count": 0, "rejected_count": 0,
        "politician_updates_count": 0, "politicians_added_count": 0,
        "created_at": now, "updated_at": now,
    }
    result = await db.visitors.insert_one(doc)
    return str(result.inserted_id)


async def _log_ticket_activity(db, ticket_id: str, action: str, detail: Optional[dict] = None, actor: Optional[str] = None):
    await db.ticket_activity_logs.insert_one({
        "ticket_id": ticket_id, "action": action, "detail": detail or {},
        "actor": actor, "created_at": utcnow_iso(),
    })


async def _queue_notification(db, *, notif_type: str, recipient_email: str, subject: str, body: str, ticket_id: Optional[str] = None):
    """
    Records intent to notify. Does not send anything yet — a future worker
    can poll for status="pending" and dispatch via an email provider.
    """
    await db.notifications.insert_one({
        "type": notif_type, "recipient_email": recipient_email,
        "subject": subject, "body": body, "ticket_id": ticket_id,
        "status": "pending", "created_at": utcnow_iso(), "sent_at": None, "error": None,
    })


# =========================================================================
# ARTICLES (admin CMS)
# =========================================================================
async def _next_article_id(db) -> str:
    counter = await db.counters.find_one_and_update(
        {"_id": "article_ART"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True,
    )
    return f"ART-{1000 + counter['seq']}"


@router.get("/admin/articles")
async def list_articles(
    q: Optional[str] = None,
    tag: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 100,
    user: dict = Depends(require_section("articles")),
):
    db = get_db()
    query: dict = {"deleted_at": None}
    if q:
        query["$or"] = [
            {"article_id": {"$regex": re.escape(q), "$options": "i"}},
            {"title": {"$regex": re.escape(q), "$options": "i"}},
        ]
    if tag:
        query["tags"] = tag
    if status:
        query["status"] = status
    docs = await db.articles.find(query).sort("created_at", -1).limit(limit).to_list(limit)
    return {"items": _serialize_list(docs)}


@router.post("/admin/articles")
async def create_article(payload: ArticleIn, request: Request, user: dict = Depends(require_section("articles"))):
    db = get_db()
    article_id = await _next_article_id(db)
    now = utcnow_iso()
    doc = {
        "article_id": article_id,
        "title": payload.title,
        "category": payload.category,
        "excerpt": payload.excerpt,
        "tags": payload.tags,
        "author": payload.author,
        "body_html": "",
        "status": "draft",
        "created_by": user.get("email"),
        "created_at": now, "updated_at": now, "deleted_at": None,
    }
    result = await db.articles.insert_one(doc)
    await audit_log(actor=user, action="article_created", entity_type="article",
                    entity_id=str(result.inserted_id), changed_fields={"article_id": article_id, "title": payload.title}, ip=_client_ip(request))
    return {"ok": True, "id": str(result.inserted_id), "article_id": article_id}


@router.get("/admin/articles/{aid}")
async def get_article_admin(aid: str, user: dict = Depends(require_section("articles"))):
    db = get_db()
    article = await db.articles.find_one({"_id": _oid(aid), "deleted_at": None})
    if not article:
        raise HTTPException(status_code=404, detail="Not found")
    a = _serialize(article)
    a["media"] = _serialize_list(
        await db.article_media.find({"article_id": a["id"], "deleted_at": None}).sort("created_at", -1).to_list(200)
    )
    return a


@router.put("/admin/articles/{aid}")
async def update_article(aid: str, payload: ArticleUpdateIn, request: Request, user: dict = Depends(require_section("articles"))):
    db = get_db()
    article = await db.articles.find_one({"_id": _oid(aid), "deleted_at": None})
    if not article:
        raise HTTPException(status_code=404, detail="Not found")
    update = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    update["updated_at"] = utcnow_iso()
    await db.articles.update_one({"_id": article["_id"]}, {"$set": update})
    await audit_log(actor=user, action="article_updated", entity_type="article",
                    entity_id=aid, changed_fields=update, ip=_client_ip(request))
    return {"ok": True}


@router.put("/admin/articles/{aid}/body")
async def update_article_body(aid: str, payload: ArticleBodyIn, request: Request, user: dict = Depends(require_section("articles"))):
    db = get_db()
    article = await db.articles.find_one({"_id": _oid(aid), "deleted_at": None})
    if not article:
        raise HTTPException(status_code=404, detail="Not found")
    clean_html = _sanitize_html(payload.html)
    await db.articles.update_one({"_id": article["_id"]}, {"$set": {"body_html": clean_html, "updated_at": utcnow_iso()}})
    await audit_log(actor=user, action="article_body_updated", entity_type="article",
                    entity_id=aid, changed_fields={"body_length": len(clean_html)}, ip=_client_ip(request))
    return {"ok": True}


@router.put("/admin/articles/{aid}/status")
async def toggle_article_status(aid: str, request: Request, user: dict = Depends(require_section("articles"))):
    db = get_db()
    article = await db.articles.find_one({"_id": _oid(aid), "deleted_at": None})
    if not article:
        raise HTTPException(status_code=404, detail="Not found")
    new_status = "draft" if article.get("status") == "published" else "published"
    await db.articles.update_one({"_id": article["_id"]}, {"$set": {"status": new_status, "updated_at": utcnow_iso()}})
    await audit_log(actor=user, action="article_status_changed", entity_type="article",
                    entity_id=aid, changed_fields={"status": new_status}, ip=_client_ip(request))
    return {"ok": True, "status": new_status}


@router.delete("/admin/articles/{aid}")
async def delete_article(aid: str, request: Request, user: dict = Depends(require_super_admin)):
    db = get_db()
    article = await db.articles.find_one({"_id": _oid(aid), "deleted_at": None})
    if not article:
        raise HTTPException(status_code=404, detail="Not found")
    await db.articles.update_one({"_id": article["_id"]}, {"$set": {"deleted_at": utcnow_iso()}})
    await audit_log(actor=user, action="article_deleted", entity_type="article",
                    entity_id=aid, changed_fields={"article_id": article.get("article_id")}, ip=_client_ip(request))
    return {"ok": True}


@router.post("/admin/articles/{aid}/media")
async def upload_article_media(aid: str, request: Request, file: UploadFile = File(...), user: dict = Depends(require_admin)):
    db = get_db()
    article = await db.articles.find_one({"_id": _oid(aid), "deleted_at": None})
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    if file.filename.lower().endswith((".html", ".htm")):
        raw = await file.read()
        try:
            text = raw.decode("utf-8")
        except UnicodeDecodeError:
            raise HTTPException(status_code=400, detail="HTML file must be UTF-8 encoded")
        clean_html = _sanitize_html(text)
        await db.articles.update_one({"_id": article["_id"]}, {"$set": {"body_html": clean_html, "updated_at": utcnow_iso()}})
        await audit_log(actor=user, action="article_body_uploaded", entity_type="article",
                        entity_id=aid, changed_fields={"filename": file.filename}, ip=_client_ip(request))
        return {"ok": True, "applied_to_body": True}

    url = await UploadService.save(file, subdir="article_media")
    doc = {
        "article_id": aid, "url": url, "filename": file.filename,
        "file_type": _media_type_for(file.content_type),
        "uploaded_by": user.get("email"),
        "created_at": utcnow_iso(), "updated_at": utcnow_iso(), "deleted_at": None,
    }
    result = await db.article_media.insert_one(doc)
    await audit_log(actor=user, action="article_media_uploaded", entity_type="article_media",
                    entity_id=str(result.inserted_id), changed_fields={"filename": file.filename}, ip=_client_ip(request))
    return {"ok": True, "id": str(result.inserted_id), "url": url}


@router.delete("/article-media/{mid}")
async def delete_article_media(mid: str, request: Request, user: dict = Depends(require_admin)):
    db = get_db()
    existing = await db.article_media.find_one({"_id": _oid(mid), "deleted_at": None})
    if not existing:
        raise HTTPException(status_code=404, detail="Not found")
    await db.article_media.update_one({"_id": existing["_id"]}, {"$set": {"deleted_at": utcnow_iso()}})
    await audit_log(actor=user, action="article_media_deleted", entity_type="article_media",
                    entity_id=mid, changed_fields={"filename": existing.get("filename")}, ip=_client_ip(request))
    return {"ok": True}


# ---------- Public: published articles ----------
@router.get("/articles")
async def list_public_articles(q: Optional[str] = None, category: Optional[str] = None, limit: int = 100):
    db = get_db()
    query: dict = {"status": "published", "deleted_at": None}
    if q:
        query["title"] = {"$regex": re.escape(q), "$options": "i"}
    if category:
        query["category"] = category
    docs = await db.articles.find(query).sort("created_at", -1).limit(limit).to_list(limit)
    return {"items": _serialize_list(docs)}


@router.get("/articles/{aid}")
async def get_public_article(aid: str):
    db = get_db()
    article = await db.articles.find_one({"article_id": aid, "status": "published", "deleted_at": None})
    if not article:
        raise HTTPException(status_code=404, detail="Not found")
    a = _serialize(article)
    a["media"] = _serialize_list(
        await db.article_media.find({"article_id": a["id"], "deleted_at": None}).sort("created_at", -1).to_list(200)
    )
    return a


@router.post("/contact")
async def submit_contact(payload: ContactIn, request: Request):
    db = get_db()
    visitor_id = await _upsert_visitor(
        db, first_name=payload.first_name, last_name=payload.last_name,
        email=payload.email, country_code=payload.country_code,
    )
    ticket_number = await _next_ticket_number(db, "CT")
    now = utcnow_iso()
    ticket_doc = {
        "ticket_number": ticket_number, "type": "contact", "visitor_id": visitor_id,
        "status": "open", "priority": "normal", "assigned_admin": None,
        "subject": payload.subject,
        "created_at": now, "updated_at": now, "deleted_at": None,
    }
    result = await db.tickets.insert_one(ticket_doc)
    ticket_id = str(result.inserted_id)
    await db.contacts.insert_one({
        "ticket_id": ticket_id,
        "first_name": payload.first_name, "last_name": payload.last_name,
        "email": payload.email, "country_code": payload.country_code,
        "subject": payload.subject, "message": payload.message,
        "source_page": payload.source_page,
        "ip_address": _client_ip(request),
        "user_agent": request.headers.get("user-agent"),
        "created_at": now,
    })
    await _log_ticket_activity(db, ticket_id, "ticket_created", {"type": "contact"})
    await _queue_notification(
        db, notif_type="ticket_created", recipient_email=payload.email,
        subject=f"We received your message ({ticket_number})",
        body=f"Thanks for contacting us. Your ticket number is {ticket_number}.",
        ticket_id=ticket_id,
    )
    return {"ok": True, "ticket_number": ticket_number, "ticket_id": ticket_id}


@router.post("/update-requests")
async def submit_update_request(payload: UpdateRequestIn, request: Request):
    db = get_db()
    if payload.request_type not in ("update_existing", "add_new"):
        raise HTTPException(status_code=400, detail="Invalid request_type")
    if payload.request_type == "update_existing" and not payload.politician_id:
        raise HTTPException(status_code=400, detail="politician_id required for update_existing")

    visitor_id = await _upsert_visitor(
        db, first_name=payload.first_name, last_name=payload.last_name,
        email=payload.email, country_code=payload.country_code, organization=payload.organization,
    )
    ticket_number = await _next_ticket_number(db, "UR")
    now = utcnow_iso()
    subject = (
        f"Update request: {payload.update_type or 'General'}"
        if payload.request_type == "update_existing"
        else f"New politician suggestion: {(payload.new_politician_data or {}).get('full_name', 'Unnamed')}"
    )
    ticket_doc = {
        "ticket_number": ticket_number, "type": "update_request", "visitor_id": visitor_id,
        "status": "open", "priority": "normal", "assigned_admin": None,
        "subject": subject,
        "politician_id": payload.politician_id,
        "created_at": now, "updated_at": now, "deleted_at": None,
    }
    result = await db.tickets.insert_one(ticket_doc)
    ticket_id = str(result.inserted_id)
    await db.update_requests.insert_one({
        "ticket_id": ticket_id,
        "request_type": payload.request_type,
        "first_name": payload.first_name, "last_name": payload.last_name,
        "email": payload.email, "country_code": payload.country_code, "organization": payload.organization,
        "politician_id": payload.politician_id, "update_type": payload.update_type,
        "description": payload.description,
        "new_politician_data": payload.new_politician_data,
        "evidence_urls": payload.evidence_urls, "notes": payload.notes,
        "created_at": now,
    })
    await _log_ticket_activity(db, ticket_id, "ticket_created", {"type": "update_request", "request_type": payload.request_type})
    await _queue_notification(
        db, notif_type="ticket_created", recipient_email=payload.email,
        subject=f"We received your submission ({ticket_number})",
        body=f"Thanks for your contribution. Your ticket number is {ticket_number}.",
        ticket_id=ticket_id,
    )
    return {"ok": True, "ticket_number": ticket_number, "ticket_id": ticket_id}


@router.post("/tickets/{ticket_id}/attachments")
async def upload_ticket_attachment(ticket_id: str, file: UploadFile = File(...)):
    db = get_db()
    ticket = await db.tickets.find_one({"_id": _oid(ticket_id), "deleted_at": None})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    url = await UploadService.save(file, subdir="ticket_attachments")
    doc = {
        "ticket_id": ticket_id, "url": url, "filename": file.filename,
        "content_type": file.content_type,
        "created_at": utcnow_iso(), "deleted_at": None,
    }
    result = await db.ticket_attachments.insert_one(doc)
    await _log_ticket_activity(db, ticket_id, "attachment_added", {"filename": file.filename})
    return {"ok": True, "id": str(result.inserted_id), "url": url}


# ---------- Admin: Community Desk list/detail (basic, Phase 1) ----------
@router.get("/admin/tickets")
async def _ticket_visible_to(user: dict, ticket: dict) -> bool:
    """Contact tickets and politician-less update requests are always visible
    to any admin with community_desk access. Update requests tied to a
    politician are only visible if that politician is within the admin's
    geo_scope."""
    if user.get("role") == "super_admin":
        return True
    if ticket.get("type") != "update_request":
        return True
    pid = ticket.get("politician_id")
    if not pid:
        return True
    db = get_db()
    try:
        politician = await db.politicians.find_one({"_id": _oid(pid), "deleted_at": None})
    except Exception:
        politician = None
    if not politician:
        return True
    return can_access_politician(user, politician)


async def list_tickets(
    status: Optional[str] = None,
    ticket_type: Optional[str] = None,
    q: Optional[str] = None,
    limit: int = 100,
    user: dict = Depends(require_section("community_desk")),
):
    db = get_db()
    query: dict = {"deleted_at": None}
    if status:
        query["status"] = status
    if ticket_type:
        query["type"] = ticket_type
    if q:
        query["$or"] = [
            {"ticket_number": {"$regex": re.escape(q), "$options": "i"}},
            {"subject": {"$regex": re.escape(q), "$options": "i"}},
        ]
    docs = await db.tickets.find(query).sort("created_at", -1).limit(limit * 2).to_list(limit * 2)
    visible = []
    for doc in docs:
        if await _ticket_visible_to(user, doc):
            visible.append(doc)
        if len(visible) >= limit:
            break
    return {"items": _serialize_list(visible)}


@router.get("/admin/tickets/stats")
async def ticket_stats(user: dict = Depends(require_admin)):
    db = get_db()
    today_start = utcnow_iso()[:10]

    open_count = await db.tickets.count_documents({"status": "open", "deleted_at": None})
    pending_review = await db.tickets.count_documents({"status": "pending_review", "deleted_at": None})
    approved_today = await db.tickets.count_documents({
        "status": "approved", "deleted_at": None,
        "updated_at": {"$regex": f"^{today_start}"},
    })
    closed_today = await db.tickets.count_documents({
        "status": "closed", "deleted_at": None,
        "updated_at": {"$regex": f"^{today_start}"},
    })
    total_contact = await db.tickets.count_documents({"type": "contact", "deleted_at": None})
    total_update_requests = await db.tickets.count_documents({"type": "update_request", "deleted_at": None})
    new_contributors = await db.visitors.count_documents({"first_contact_date": {"$regex": f"^{today_start}"}})
    repeat_contributors = await db.visitors.count_documents({"ticket_count": {"$gt": 1}})

    return {
        "open_tickets": open_count,
        "pending_review": pending_review,
        "approved_today": approved_today,
        "closed_today": closed_today,
        "total_contact_requests": total_contact,
        "total_update_requests": total_update_requests,
        "new_contributors_today": new_contributors,
        "repeat_contributors": repeat_contributors,
        "avg_response_time_hours": None,
        "avg_resolution_time_hours": None,
    }


@router.get("/admin/visitors")
async def list_visitors(
    q: Optional[str] = None,
    sort: str = "recent",
    limit: int = 100,
    user: dict = Depends(require_admin),
):
    db = get_db()
    query: dict = {}
    if q:
        query["$or"] = [
            {"first_name": {"$regex": re.escape(q), "$options": "i"}},
            {"last_name": {"$regex": re.escape(q), "$options": "i"}},
            {"email": {"$regex": re.escape(q), "$options": "i"}},
        ]
    sort_field = [("ticket_count", -1)] if sort == "most_active" else [("last_contact_date", -1)]
    docs = await db.visitors.find(query).sort(sort_field).limit(limit).to_list(limit)
    return {"items": _serialize_list(docs)}


@router.get("/admin/visitors/{visitor_id}")
async def get_visitor(visitor_id: str, user: dict = Depends(require_admin)):
    db = get_db()
    visitor = await db.visitors.find_one({"_id": _oid(visitor_id)})
    if not visitor:
        raise HTTPException(status_code=404, detail="Not found")
    v = _serialize(visitor)
    v["tickets"] = _serialize_list(
        await db.tickets.find({"visitor_id": visitor_id, "deleted_at": None}).sort("created_at", -1).to_list(200)
    )
    return v


@router.delete("/admin/visitors/{visitor_id}")
async def delete_visitor(visitor_id: str, request: Request, user: dict = Depends(require_super_admin)):
    db = get_db()
    visitor = await db.visitors.find_one({"_id": _oid(visitor_id)})
    if not visitor:
        raise HTTPException(status_code=404, detail="Not found")
    await db.visitors.delete_one({"_id": visitor["_id"]})
    await audit_log(actor=user, action="visitor_deleted", entity_type="visitor",
                    entity_id=visitor_id, changed_fields={"email": visitor.get("email")}, ip=_client_ip(request))
    return {"ok": True}


@router.get("/admin/tickets/export")
async def export_tickets(
    status: Optional[str] = None,
    ticket_type: Optional[str] = None,
    user: dict = Depends(require_admin),
):
    db = get_db()
    query: dict = {"deleted_at": None}
    if status:
        query["status"] = status
    if ticket_type:
        query["type"] = ticket_type
    docs = await db.tickets.find(query).sort("created_at", -1).to_list(100000)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ticket_number", "type", "status", "subject", "assigned_admin", "created_at", "updated_at"])
    for doc in docs:
        writer.writerow([
            doc.get("ticket_number", ""), doc.get("type", ""), doc.get("status", ""),
            doc.get("subject", ""), doc.get("assigned_admin", "") or "",
            doc.get("created_at", ""), doc.get("updated_at", ""),
        ])
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=tickets_export.csv"},
    )


_UPDATE_EXISTING_ALLOWED_FIELDS = {
    "name", "party", "role", "brief_intro", "image_url", "education", "profession",
    "date_of_birth", "contact_email", "contact_phone", "official_website",
}


async def _resolve_or_create_geo(db, country_code: Optional[str], state_name: Optional[str], city_name: Optional[str], constituency_name: Optional[str]):
    state_id = city_id = constituency_id = None
    if state_name and country_code:
        existing_state = await db.states.find_one(
            {"country_code": country_code, "name": {"$regex": f"^{re.escape(state_name)}$", "$options": "i"}}
        )
        if existing_state:
            state_id = str(existing_state["_id"])
        else:
            result = await db.states.insert_one({
                "name": state_name, "country_code": country_code,
                "created_at": utcnow_iso(), "updated_at": utcnow_iso(), "deleted_at": None,
            })
            state_id = str(result.inserted_id)
    if city_name and state_id:
        existing_city = await db.cities.find_one(
            {"state_id": state_id, "name": {"$regex": f"^{re.escape(city_name)}$", "$options": "i"}}
        )
        if existing_city:
            city_id = str(existing_city["_id"])
        else:
            result = await db.cities.insert_one({
                "name": city_name, "state_id": state_id,
                "created_at": utcnow_iso(), "updated_at": utcnow_iso(), "deleted_at": None,
            })
            city_id = str(result.inserted_id)
    if constituency_name and state_id:
        existing_const = await db.constituencies.find_one(
            {"state_id": state_id, "name": {"$regex": f"^{re.escape(constituency_name)}$", "$options": "i"}}
        )
        if existing_const:
            constituency_id = str(existing_const["_id"])
        else:
            result = await db.constituencies.insert_one({
                "name": constituency_name, "state_id": state_id,
                "created_at": utcnow_iso(), "updated_at": utcnow_iso(), "deleted_at": None,
            })
            constituency_id = str(result.inserted_id)
    return state_id, city_id, constituency_id


@router.get("/admin/tickets/{ticket_id}")
async def get_ticket(ticket_id: str, user: dict = Depends(require_section("community_desk"))):
    db = get_db()
    ticket = await db.tickets.find_one({"_id": _oid(ticket_id), "deleted_at": None})
    if not ticket:
        raise HTTPException(status_code=404, detail="Not found")
    if not await _ticket_visible_to(user, ticket):
        raise HTTPException(status_code=403, detail="No access to this ticket's region")
    t = _serialize(ticket)
    if t["type"] == "contact":
        detail = await db.contacts.find_one({"ticket_id": t["id"]})
    else:
        detail = await db.update_requests.find_one({"ticket_id": t["id"]})
    t["detail"] = _serialize(detail) if detail else None
    t["attachments"] = _serialize_list(
        await db.ticket_attachments.find({"ticket_id": t["id"], "deleted_at": None}).to_list(100)
    )
    t["messages"] = _serialize_list(
        await db.ticket_messages.find({"ticket_id": t["id"], "deleted_at": None}).sort("created_at", 1).to_list(500)
    )
    t["activity"] = _serialize_list(
        await db.ticket_activity_logs.find({"ticket_id": t["id"]}).sort("created_at", 1).to_list(500)
    )
    return t


@router.post("/admin/tickets/{ticket_id}/messages")
async def add_ticket_message(ticket_id: str, payload: TicketMessageIn, request: Request, user: dict = Depends(require_admin)):
    db = get_db()
    ticket = await db.tickets.find_one({"_id": _oid(ticket_id), "deleted_at": None})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    doc = {
        "ticket_id": ticket_id,
        "body": payload.body,
        "is_internal": payload.is_internal,
        "author_email": user.get("email"),
        "author_role": user.get("role"),
        "created_at": utcnow_iso(),
        "deleted_at": None,
    }
    result = await db.ticket_messages.insert_one(doc)
    await db.tickets.update_one({"_id": ticket["_id"]}, {"$set": {"updated_at": utcnow_iso()}})
    await _log_ticket_activity(
        db, ticket_id,
        "internal_note_added" if payload.is_internal else "reply_added",
        {"author": user.get("email")},
        actor=user.get("email"),
    )
    if not payload.is_internal:
        detail_doc = await db.contacts.find_one({"ticket_id": ticket_id}) or await db.update_requests.find_one({"ticket_id": ticket_id})
        if detail_doc and detail_doc.get("email"):
            await _queue_notification(
                db, notif_type="reply_added", recipient_email=detail_doc["email"],
                subject=f"New reply on your ticket ({ticket.get('ticket_number')})",
                body=payload.body,
                ticket_id=ticket_id,
            )
    await audit_log(actor=user, action="ticket_message_added", entity_type="ticket",
                    entity_id=ticket_id, changed_fields={"is_internal": payload.is_internal}, ip=_client_ip(request))
    return {"ok": True, "id": str(result.inserted_id)}


VALID_TICKET_STATUSES = {
    "open", "pending_review", "waiting_for_user", "approved",
    "rejected", "solved", "closed", "spam", "archived",
}


@router.put("/admin/tickets/{ticket_id}/status")
async def update_ticket_status(ticket_id: str, payload: TicketStatusIn, request: Request, user: dict = Depends(require_admin)):
    db = get_db()
    if payload.status not in VALID_TICKET_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(sorted(VALID_TICKET_STATUSES))}")
    ticket = await db.tickets.find_one({"_id": _oid(ticket_id), "deleted_at": None})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    old_status = ticket.get("status")
    await db.tickets.update_one({"_id": ticket["_id"]}, {"$set": {"status": payload.status, "updated_at": utcnow_iso()}})
    await _log_ticket_activity(
        db, ticket_id, "status_changed",
        {"from": old_status, "to": payload.status},
        actor=user.get("email"),
    )
    await audit_log(actor=user, action="ticket_status_changed", entity_type="ticket",
                    entity_id=ticket_id, changed_fields={"from": old_status, "to": payload.status}, ip=_client_ip(request))
    return {"ok": True}


@router.put("/admin/tickets/{ticket_id}/assign")
async def assign_ticket(ticket_id: str, request: Request, payload: TicketAssignIn = TicketAssignIn(), user: dict = Depends(require_admin)):
    db = get_db()
    ticket = await db.tickets.find_one({"_id": _oid(ticket_id), "deleted_at": None})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    target_email = payload.admin_email or user.get("email")
    if payload.admin_email:
        target_admin = await db.users.find_one({"email": payload.admin_email, "role": {"$in": ["admin", "super_admin"]}, "deleted_at": None})
        if not target_admin:
            raise HTTPException(status_code=400, detail="Target admin not found")
    await db.tickets.update_one({"_id": ticket["_id"]}, {"$set": {"assigned_admin": target_email, "updated_at": utcnow_iso()}})
    await _log_ticket_activity(db, ticket_id, "assigned", {"to": target_email}, actor=user.get("email"))
    await audit_log(actor=user, action="ticket_assigned", entity_type="ticket",
                    entity_id=ticket_id, changed_fields={"assigned_to": target_email}, ip=_client_ip(request))
    return {"ok": True}


@router.delete("/admin/tickets/{ticket_id}")
async def delete_ticket(ticket_id: str, request: Request, user: dict = Depends(require_super_admin)):
    db = get_db()
    ticket = await db.tickets.find_one({"_id": _oid(ticket_id), "deleted_at": None})
    if not ticket:
        raise HTTPException(status_code=404, detail="Not found")
    await db.tickets.update_one({"_id": ticket["_id"]}, {"$set": {"deleted_at": utcnow_iso()}})
    await audit_log(actor=user, action="ticket_deleted", entity_type="ticket",
                    entity_id=ticket_id, changed_fields={"ticket_number": ticket.get("ticket_number")}, ip=_client_ip(request))
    return {"ok": True}


@router.post("/admin/tickets/{ticket_id}/merge")
async def merge_tickets(ticket_id: str, payload: TicketMergeIn, request: Request, user: dict = Depends(require_admin)):
    db = get_db()
    master = await db.tickets.find_one({"_id": _oid(ticket_id), "deleted_at": None})
    if not master:
        raise HTTPException(status_code=404, detail="Master ticket not found")

    merged_numbers = []
    for merge_id in payload.merge_ticket_ids:
        if merge_id == ticket_id:
            continue
        dup = await db.tickets.find_one({"_id": _oid(merge_id), "deleted_at": None})
        if not dup:
            continue
        await db.ticket_messages.update_many({"ticket_id": merge_id}, {"$set": {"ticket_id": ticket_id, "merged_from": merge_id}})
        await db.ticket_attachments.update_many({"ticket_id": merge_id}, {"$set": {"ticket_id": ticket_id, "merged_from": merge_id}})
        await db.ticket_activity_logs.update_many({"ticket_id": merge_id}, {"$set": {"ticket_id": ticket_id, "merged_from": merge_id}})
        await db.tickets.update_one(
            {"_id": dup["_id"]},
            {"$set": {"deleted_at": utcnow_iso(), "status": "closed", "merged_into": ticket_id, "updated_at": utcnow_iso()}}
        )
        merged_numbers.append(dup.get("ticket_number"))

    await _log_ticket_activity(db, ticket_id, "merged", {"merged_tickets": merged_numbers}, actor=user.get("email"))
    await audit_log(actor=user, action="tickets_merged", entity_type="ticket",
                    entity_id=ticket_id, changed_fields={"merged": merged_numbers}, ip=_client_ip(request))
    return {"ok": True, "merged": merged_numbers}


@router.post("/admin/tickets/{ticket_id}/approve")
async def approve_ticket(ticket_id: str, payload: TicketApproveIn, request: Request, user: dict = Depends(require_admin)):
    db = get_db()
    ticket = await db.tickets.find_one({"_id": _oid(ticket_id), "deleted_at": None})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if ticket["type"] != "update_request":
        raise HTTPException(status_code=400, detail="Only update_request tickets can be approved this way")

    update_req = await db.update_requests.find_one({"ticket_id": ticket_id})
    if not update_req:
        raise HTTPException(status_code=404, detail="Update request detail not found")

    result_summary = {}

    if update_req["request_type"] == "update_existing":
        if not payload.applied_changes:
            raise HTTPException(status_code=400, detail="applied_changes required for update_existing approval")
        bad_fields = set(payload.applied_changes.keys()) - _UPDATE_EXISTING_ALLOWED_FIELDS
        if bad_fields:
            raise HTTPException(status_code=400, detail=f"Fields not allowed: {', '.join(bad_fields)}")
        politician = await db.politicians.find_one({"_id": _oid(update_req["politician_id"]), "deleted_at": None})
        if not politician:
            raise HTTPException(status_code=404, detail="Target politician not found")
        previous_values = {k: politician.get(k) for k in payload.applied_changes.keys()}
        update_set = dict(payload.applied_changes)
        update_set["updated_at"] = utcnow_iso()
        await db.politicians.update_one({"_id": politician["_id"]}, {"$set": update_set})
        result_summary = {"previous_values": previous_values, "new_values": payload.applied_changes, "politician_id": update_req["politician_id"]}
        visitor_field = "politician_updates_count"

    elif update_req["request_type"] == "add_new":
        data = payload.politician_data or update_req.get("new_politician_data") or {}
        country_code = (data.get("country_code") or "").strip().upper()
        if not country_code or not data.get("full_name"):
            raise HTTPException(status_code=400, detail="full_name and country_code are required to create a politician")
        state_id, city_id, constituency_id = await _resolve_or_create_geo(
            db, country_code, data.get("state"), data.get("city"), data.get("constituency")
        )
        doc = {
            "name": data.get("full_name"), "party": data.get("party") or None,
            "role": data.get("current_position") or None, "brief_intro": data.get("biography") or None,
            "image_url": None, "country_code": country_code,
            "state_id": state_id, "city_id": city_id, "constituency_id": constituency_id,
            "date_of_birth": data.get("date_of_birth") or None,
            "gender": data.get("gender") or None,
            "official_website": data.get("official_website") or None,
            "social_links": {
                "twitter": data.get("twitter") or None,
                "facebook": data.get("facebook") or None,
                "instagram": data.get("instagram") or None,
                "youtube": data.get("youtube") or None,
            },
            "tags": [],
            "created_at": utcnow_iso(), "updated_at": utcnow_iso(), "deleted_at": None,
        }
        result = await db.politicians.insert_one(doc)
        result_summary = {"created_politician_id": str(result.inserted_id), "politician_data": data}
        visitor_field = "politicians_added_count"
    else:
        raise HTTPException(status_code=400, detail="Unknown request_type")

    now = utcnow_iso()
    await db.tickets.update_one(
        {"_id": ticket["_id"]},
        {"$set": {"status": "approved", "approved_by": user.get("email"), "approved_at": now, "updated_at": now}}
    )
    await db.update_requests.update_one({"_id": update_req["_id"]}, {"$set": {"resolution": result_summary}})

    visitor = await db.visitors.find_one({"_id": _oid(ticket["visitor_id"])}) if ticket.get("visitor_id") else None
    if visitor:
        await db.visitors.update_one({"_id": visitor["_id"]}, {"$inc": {"approved_count": 1, visitor_field: 1}})

    if visitor and visitor.get("email"):
        await _queue_notification(
            db, notif_type="approved", recipient_email=visitor["email"],
            subject=f"Your submission was approved ({ticket.get('ticket_number')})",
            body="Good news — your contribution has been reviewed and approved.",
            ticket_id=ticket_id,
        )
    await _log_ticket_activity(db, ticket_id, "approved", result_summary, actor=user.get("email"))
    await audit_log(actor=user, action="ticket_approved", entity_type="ticket",
                    entity_id=ticket_id, changed_fields=result_summary, ip=_client_ip(request))
    return {"ok": True, **result_summary}


@router.post("/admin/tickets/{ticket_id}/reject")
async def reject_ticket(ticket_id: str, payload: TicketRejectIn, request: Request, user: dict = Depends(require_admin)):
    db = get_db()
    ticket = await db.tickets.find_one({"_id": _oid(ticket_id), "deleted_at": None})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    now = utcnow_iso()
    await db.tickets.update_one(
        {"_id": ticket["_id"]},
        {"$set": {"status": "rejected", "rejected_by": user.get("email"), "rejected_at": now, "rejection_reason": payload.reason, "updated_at": now}}
    )
    visitor = await db.visitors.find_one({"_id": _oid(ticket["visitor_id"])}) if ticket.get("visitor_id") else None
    if visitor:
        await db.visitors.update_one({"_id": visitor["_id"]}, {"$inc": {"rejected_count": 1}})
        if visitor.get("email"):
            await _queue_notification(
                db, notif_type="rejected", recipient_email=visitor["email"],
                subject=f"Update on your submission ({ticket.get('ticket_number')})",
                body=f"Your submission was reviewed and not approved.{' Reason: ' + payload.reason if payload.reason else ''}",
                ticket_id=ticket_id,
            )
    await _log_ticket_activity(db, ticket_id, "rejected", {"reason": payload.reason}, actor=user.get("email"))
    await audit_log(actor=user, action="ticket_rejected", entity_type="ticket",
                    entity_id=ticket_id, changed_fields={"reason": payload.reason}, ip=_client_ip(request))
    return {"ok": True}


# ---------- Regional Search ----------
@router.get("/search/positions")
async def search_positions(
    country_code: Optional[str] = None,
    state_id: Optional[str] = None,
    city_id: Optional[str] = None,
    constituency_id: Optional[str] = None,
    position: Optional[str] = None,
    party: Optional[str] = None,
    election_year: Optional[int] = None,
    status: Optional[str] = None,
    limit: int = 100,
):
    db = get_db()
    query: dict = {"deleted_at": None}
    if country_code:
        query["country_code"] = country_code
    if state_id:
        query["state_id"] = state_id
    if city_id:
        query["city_id"] = city_id
    if constituency_id:
        query["constituency_id"] = constituency_id
    if position:
        query["position"] = {"$regex": re.escape(position), "$options": "i"}
    if party:
        query["party"] = {"$regex": re.escape(party), "$options": "i"}
    if election_year:
        query["election_year"] = election_year
    if status == "current":
        query["is_current"] = True
    elif status == "former":
        query["is_current"] = False

    docs = await db.position_history.find(query).to_list(limit * 3)

    pol_cache: dict = {}
    geo_cache = {"country": {}, "state": {}, "city": {}, "constituency": {}}

    async def get_politician(pid):
        if pid not in pol_cache:
            try:
                doc = await db.politicians.find_one({"_id": _oid(pid), "deleted_at": None})
            except Exception:
                doc = None
            pol_cache[pid] = doc
        return pol_cache[pid]

    async def get_geo_name(kind, key):
        if not key:
            return None
        cache = geo_cache[kind]
        if key not in cache:
            try:
                if kind == "country":
                    doc = await db.countries.find_one({"code": key})
                elif kind == "state":
                    doc = await db.states.find_one({"_id": _oid(key)})
                elif kind == "city":
                    doc = await db.cities.find_one({"_id": _oid(key)})
                else:
                    doc = await db.constituencies.find_one({"_id": _oid(key)})
                cache[key] = doc.get("name") if doc else None
            except Exception:
                cache[key] = None
        return cache[key]

    results = []
    for doc in docs:
        pol = await get_politician(doc.get("politician_id"))
        if not pol:
            continue
        results.append({
            "politician_id": str(pol["_id"]),
            "name": pol.get("name"),
            "photo_url": pol.get("image_url"),
            "verified": pol.get("verified", False),
            "position": doc.get("position"),
            "party": doc.get("party") or pol.get("party"),
            "is_current": bool(doc.get("is_current")),
            "start_date": doc.get("start_date"),
            "end_date": doc.get("end_date"),
            "election_year": doc.get("election_year"),
            "country_name": await get_geo_name("country", doc.get("country_code")),
            "state_name": await get_geo_name("state", doc.get("state_id")),
            "city_name": await get_geo_name("city", doc.get("city_id")),
            "constituency_name": await get_geo_name("constituency", doc.get("constituency_id")),
        })

    current = sorted([r for r in results if r["is_current"]], key=lambda r: (r["position"] or "", r["name"] or ""))
    former = sorted([r for r in results if not r["is_current"]], key=lambda r: (r["name"] or ""))

    grouped_current: dict = {}
    for r in current:
        grouped_current.setdefault(r["position"] or "Other", []).append(r)

    return {
        "current": [{"position": k, "politicians": v} for k, v in grouped_current.items()],
        "former": former[:limit],
    }


# ---------- Promise Leaderboards ----------
@router.get("/leaderboards/promises")
async def promise_leaderboard(kind: str = "keepers", limit: int = 100, min_promises: int = 5):
    db = get_db()
    pipeline = [
        {"$match": {"deleted_at": None}},
        {"$group": {
            "_id": "$politician_id",
            "total": {"$sum": 1},
            "delivered": {"$sum": {"$cond": [{"$eq": ["$status", "delivered"]}, 1, 0]}},
            "broken": {"$sum": {"$cond": [{"$eq": ["$status", "broken"]}, 1, 0]}},
        }},
        {"$match": {"total": {"$gte": min_promises}}},
        {"$addFields": {
            "delivered_pct": {"$multiply": [{"$divide": ["$delivered", "$total"]}, 100]},
            "broken_pct": {"$multiply": [{"$divide": ["$broken", "$total"]}, 100]},
        }},
    ]
    if kind == "breakers":
        pipeline.append({"$sort": {"broken_pct": -1, "broken": -1}})
    else:
        pipeline.append({"$sort": {"delivered_pct": -1, "delivered": -1}})
    pipeline.append({"$limit": limit})

    rows = await db.promises.aggregate(pipeline).to_list(limit)

    results = []
    for row in rows:
        pid = row["_id"]
        try:
            pol = await db.politicians.find_one({"_id": _oid(pid), "deleted_at": None})
        except Exception:
            pol = None
        if not pol:
            continue
        results.append({
            "politician_id": str(pol["_id"]),
            "name": pol.get("name"),
            "photo_url": pol.get("image_url"),
            "party": pol.get("party"),
            "role": pol.get("role"),
            "country_code": pol.get("country_code"),
            "total_promises": row["total"],
            "delivered_count": row["delivered"],
            "broken_count": row["broken"],
            "delivered_pct": round(row["delivered_pct"], 1),
            "broken_pct": round(row["broken_pct"], 1),
        })
    return {"items": results}


# =========================================================================
# UPLOAD
# =========================================================================
@router.post("/upload/image")
async def upload_image(file: UploadFile = File(...), user: dict = Depends(require_admin)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image uploads are allowed")
    url = await UploadService.save(file, subdir="politicians")
    return {"url": url}


# =========================================================================
# AUDIT LOG
# =========================================================================
@router.get("/admin/audit")
async def get_audit(
    actor: Optional[str] = None,
    entity_type: Optional[str] = None,
    action: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    limit: int = 200,
    _user: dict = Depends(require_super_admin),
):
    db = get_db()
    q: dict = {}
    if actor:
        q["actor_email"] = {"$regex": re.escape(actor), "$options": "i"}
    if entity_type:
        q["entity_type"] = entity_type
    if action:
        q["action"] = action
    if from_date or to_date:
        ts: dict = {}
        if from_date:
            ts["$gte"] = from_date
        if to_date:
            ts["$lte"] = to_date
        q["timestamp"] = ts
    docs = await db.audit_events.find(q).sort("timestamp", -1).limit(limit).to_list(limit)
    return {"items": _serialize_list(docs)}


# =========================================================================
# TRASH — soft delete restore + purge (super_admin)
# =========================================================================
@router.get("/admin/trash")
async def list_trash(entity_type: Optional[str] = None, _user: dict = Depends(require_super_admin)):
    db = get_db()
    if entity_type and entity_type in ENTITY_COLLECTIONS:
        collections = {entity_type: ENTITY_COLLECTIONS[entity_type]}
    else:
        collections = ENTITY_COLLECTIONS
    items: list[dict] = []
    for etype, coll in collections.items():
        docs = await db[coll].find({"deleted_at": {"$ne": None}}).sort("deleted_at", -1).limit(200).to_list(200)
        for d in docs:
            d_ser = _serialize(d)
            items.append({"entity_type": etype, "entity_id": d_ser["id"], "record": d_ser})
    return {"items": items}


@router.post("/admin/trash/restore")
async def restore_entity(payload: RestoreIn, request: Request, user: dict = Depends(require_super_admin)):
    coll = ENTITY_COLLECTIONS.get(payload.entity_type)
    if not coll:
        raise HTTPException(status_code=400, detail="Unknown entity type")
    db = get_db()
    result = await db[coll].update_one(
        {"_id": _oid(payload.entity_id), "deleted_at": {"$ne": None}},
        {"$set": {"deleted_at": None, "updated_at": utcnow_iso()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Entity not found in trash")
    await audit_log(actor=user, action=f"{payload.entity_type}_restored", entity_type=payload.entity_type,
                    entity_id=payload.entity_id, ip=_client_ip(request))
    return {"ok": True}


@router.post("/admin/trash/purge")
async def purge_entity(payload: PurgeIn, request: Request, user: dict = Depends(require_super_admin)):
    coll = ENTITY_COLLECTIONS.get(payload.entity_type)
    name_field = ENTITY_NAME_FIELDS.get(payload.entity_type)
    if not coll or not name_field:
        raise HTTPException(status_code=400, detail="Unknown entity type")
    db = get_db()
    existing = await db[coll].find_one({"_id": _oid(payload.entity_id), "deleted_at": {"$ne": None}})
    if not existing:
        raise HTTPException(status_code=404, detail="Entity not found in trash")
    actual_name = str(existing.get(name_field, ""))
    if actual_name.strip() != payload.confirm_name.strip():
        raise HTTPException(status_code=400, detail=f"Confirmation must exactly match: {actual_name}")
    await db[coll].delete_one({"_id": existing["_id"]})
    await audit_log(actor=user, action=f"{payload.entity_type}_purged", entity_type=payload.entity_type,
                    entity_id=payload.entity_id,
                    changed_fields={name_field: actual_name}, ip=_client_ip(request))
    return {"ok": True}
