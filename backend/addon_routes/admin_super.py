"""Super-admin promotion/demotion. Deliberately separate from the general
/admin/admins CRUD in routes.py, since granting/revoking super_admin is the
highest-privilege action in the system.

Deletion of any super_admin is already blocked in routes.py's delete_admin.
This file adds the missing piece: demotion, with a hard guard for the
designated 'primary' super admin (never demotable, never deletable) and
for the last remaining super_admin (can't demote to zero)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request

from db import get_db, utcnow_iso
from services import audit_log
from addon_routes.deps import _oid, _client_ip, require_super_admin

router = APIRouter(prefix="/api/admin/super", tags=["admin-super"])


@router.post("/promote/{user_id}")
async def promote_to_super_admin(user_id: str, request: Request, user: dict = Depends(require_super_admin)):
    db = get_db()
    target = await db.users.find_one({"_id": _oid(user_id), "deleted_at": None})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target["role"] == "super_admin":
        raise HTTPException(status_code=400, detail="User is already a super admin")
    if target["role"] != "admin":
        raise HTTPException(status_code=400, detail="Only existing admins can be promoted")

    await db.users.update_one(
        {"_id": target["_id"]},
        {"$set": {"role": "super_admin", "updated_at": utcnow_iso()}},
    )
    await audit_log(
        actor=user,
        action="admin_promoted",
        entity_type="user",
        entity_id=user_id,
        changed_fields={"role": {"from": "admin", "to": "super_admin"}},
        ip=_client_ip(request),
    )
    return {"ok": True}


@router.post("/demote/{user_id}")
async def demote_super_admin(user_id: str, request: Request, user: dict = Depends(require_super_admin)):
    db = get_db()
    target = await db.users.find_one({"_id": _oid(user_id), "deleted_at": None})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target["role"] != "super_admin":
        raise HTTPException(status_code=400, detail="User is not a super admin")
    if target.get("primary"):
        raise HTTPException(status_code=403, detail="Cannot demote the primary super admin")
    if str(target["_id"]) == str(user["_id"]):
        raise HTTPException(status_code=403, detail="Cannot demote yourself")

    remaining = await db.users.count_documents({"role": "super_admin", "deleted_at": None})
    if remaining <= 1:
        raise HTTPException(status_code=403, detail="Cannot demote the last remaining super admin")

    await db.users.update_one(
        {"_id": target["_id"]},
        {"$set": {"role": "admin", "updated_at": utcnow_iso()}},
    )
    await audit_log(
        actor=user,
        action="admin_demoted",
        entity_type="user",
        entity_id=user_id,
        changed_fields={"role": {"from": "super_admin", "to": "admin"}},
        ip=_client_ip(request),
    )
    return {"ok": True}
