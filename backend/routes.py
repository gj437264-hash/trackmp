"""All API routes for TrackMP."""
from __future__ import annotations

import os
import re
import secrets
from datetime import timedelta
from typing import Any, List, Optional

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, Response, UploadFile
from pydantic import EmailStr

from db import get_db, utcnow, utcnow_iso
from models import (
    AdminCreateIn,
    AdminUpdateIn,
    CityIn,
    CityUpdateIn,
    ConstituencyIn,
    ConstituencyUpdateIn,
    CountryIn,
    CountryUpdateIn,
    ForgotPasswordIn,
    LoginIn,
    MagicRegisterIn,
    PoliticianIn,
    PoliticianUpdateIn,
    PurgeIn,
    RelativeIn,
    ResetPasswordIn,
    RestoreIn,
    SignupDecisionIn,
    SignupRequestIn,
    StateIn,
    StateUpdateIn,
    WealthEntryIn,
)
from security import (
    clear_auth_cookies,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
    hash_password,
    require_admin,
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
        rs["wealth"] = _serialize_list(
            await db.wealth_entries.find(
                {"relative_id": rs["id"], "deleted_at": None}
            ).sort("year", 1).to_list(500)
        )
        hydrated_relatives.append(rs)
    d["relatives"] = hydrated_relatives
    return d


@router.get("/politicians")
async def list_politicians(
    q: Optional[str] = None,
    country_code: Optional[str] = None,
    state_id: Optional[str] = None,
    constituency_id: Optional[str] = None,
    limit: int = 60,
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
    return {"items": _serialize_list(docs)}


@router.get("/politicians/{pid}")
async def get_politician(pid: str):
    db = get_db()
    doc = await db.politicians.find_one({"_id": _oid(pid), "deleted_at": None})
    if not doc:
        raise HTTPException(status_code=404, detail="Politician not found")
    return await _hydrate_politician(doc)


@router.post("/politicians")
async def create_politician(payload: PoliticianIn, request: Request, user: dict = Depends(require_admin)):
    db = get_db()
    doc = payload.model_dump()
    doc.update({"created_at": utcnow_iso(), "updated_at": utcnow_iso(), "deleted_at": None})
    result = await db.politicians.insert_one(doc)
    await audit_log(actor=user, action="politician_created", entity_type="politician",
                    entity_id=str(result.inserted_id), changed_fields={"name": payload.name},
                    ip=_client_ip(request))
    return {"ok": True, "id": str(result.inserted_id)}


@router.put("/politicians/{pid}")
async def update_politician(pid: str, payload: PoliticianUpdateIn, request: Request, user: dict = Depends(require_admin)):
    db = get_db()
    existing = await db.politicians.find_one({"_id": _oid(pid), "deleted_at": None})
    if not existing:
        raise HTTPException(status_code=404, detail="Not found")
    update_data = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    update_data["updated_at"] = utcnow_iso()
    await db.politicians.update_one({"_id": existing["_id"]}, {"$set": update_data})
    changed = diff_dict(existing, {**existing, **update_data}, list(update_data.keys()))
    await audit_log(actor=user, action="politician_updated", entity_type="politician",
                    entity_id=pid, changed_fields=changed, ip=_client_ip(request))
    return {"ok": True}


@router.delete("/politicians/{pid}")
async def delete_politician(pid: str, request: Request, user: dict = Depends(require_admin)):
    db = get_db()
    existing = await db.politicians.find_one({"_id": _oid(pid), "deleted_at": None})
    if not existing:
        raise HTTPException(status_code=404, detail="Not found")
    now = utcnow_iso()
    await db.politicians.update_one({"_id": existing["_id"]}, {"$set": {"deleted_at": now}})
    await audit_log(actor=user, action="politician_deleted", entity_type="politician",
                    entity_id=pid, changed_fields={"name": existing["name"]}, ip=_client_ip(request))
    return {"ok": True}


# ---------- Wealth entries (politician-level or relative-level) ----------
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
        "created_at": utcnow_iso(), "updated_at": utcnow_iso(), "deleted_at": None,
    }
    result = await db.relatives.insert_one(doc)
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
    update = payload.model_dump()
    update["updated_at"] = utcnow_iso()
    await db.relatives.update_one({"_id": existing["_id"]}, {"$set": update})
    await audit_log(actor=user, action="relative_updated", entity_type="relative",
                    entity_id=rid, changed_fields=diff_dict(existing, {**existing, **update},
                    ["name", "relationship", "description"]), ip=_client_ip(request))
    return {"ok": True}


@router.delete("/relatives/{rid}")
async def delete_relative(rid: str, request: Request, user: dict = Depends(require_admin)):
    db = get_db()
    existing = await db.relatives.find_one({"_id": _oid(rid), "deleted_at": None})
    if not existing:
        raise HTTPException(status_code=404, detail="Not found")
    await db.relatives.update_one({"_id": existing["_id"]}, {"$set": {"deleted_at": utcnow_iso()}})
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
