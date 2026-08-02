from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel

from routes import (
    get_db,
    _oid,
    require_section,
    can_access_politician,
    audit_log,
    utcnow_iso,
    _client_ip,
)

router = APIRouter(prefix="/api")


class VerifyPoliticianIn(BaseModel):
    verified: bool


@router.patch("/politicians/{pid}/verify")
async def set_politician_verified(
    pid: str,
    payload: VerifyPoliticianIn,
    request: Request,
    user: dict = Depends(require_section("politicians")),
):
    db = get_db()
    existing = await db.politicians.find_one({"_id": _oid(pid), "deleted_at": None})
    if not existing:
        raise HTTPException(status_code=404, detail="Not found")
    if not can_access_politician(user, existing):
        raise HTTPException(status_code=403, detail="No access to this politician's region")

    await db.politicians.update_one(
        {"_id": existing["_id"]},
        {"$set": {"verified": payload.verified, "updated_at": utcnow_iso()}},
    )
    await audit_log(
        actor=user,
        action="politician_verified" if payload.verified else "politician_unverified",
        entity_type="politician",
        entity_id=pid,
        changed_fields={"verified": payload.verified},
        ip=_client_ip(request),
    )
    return {"ok": True, "verified": payload.verified}
