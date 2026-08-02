"""
Promise attachment routes: source links and uploaded files attached to a
politician promise. Links are plain URL metadata (no upload); files are
stored via the shared UploadService, mirroring upload_media()/
upload_article_media() in routes.py. Both support an optional
user-supplied display `name`, falling back to the URL or original
filename on the frontend when absent.
"""
from typing import Optional
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile

from routes import (
    get_db, _oid, UploadService, _media_type_for, utcnow_iso,
    audit_log, _client_ip, require_authenticated,
)
from models import PromiseLinkIn

router = APIRouter(prefix="/api")


async def _get_promise_or_404(db, prid: str):
    existing = await db.promises.find_one({"_id": _oid(prid), "deleted_at": None})
    if not existing:
        raise HTTPException(status_code=404, detail="Promise not found")
    return existing


def _check_edit_auth(existing: dict, user: dict):
    is_owner = existing.get("created_by") == user["_id"]
    is_admin = user.get("role") in ("admin", "super_admin")
    if not (is_owner or is_admin):
        raise HTTPException(status_code=403, detail="Not authorized to edit this promise")


# ---------- Source links ----------

@router.post("/promises/{prid}/links")
async def add_promise_link(prid: str, payload: PromiseLinkIn, request: Request,
                            user: dict = Depends(require_authenticated)):
    db = get_db()
    existing = await _get_promise_or_404(db, prid)
    _check_edit_auth(existing, user)

    link = {
        "id": uuid.uuid4().hex,
        "name": (payload.name or "").strip() or None,
        "url": payload.url,
        "added_by": user.get("name") or user.get("email", "Unknown"),
        "created_at": utcnow_iso(),
    }
    await db.promises.update_one(
        {"_id": existing["_id"]},
        {"$push": {"source_links": link}, "$set": {"updated_at": utcnow_iso()}},
    )
    await audit_log(actor=user, action="promise_link_added", entity_type="promise",
                     entity_id=prid, changed_fields={"link_id": link["id"], "url": link["url"]},
                     ip=_client_ip(request))
    return {"ok": True, "link": link}


@router.delete("/promises/{prid}/links/{link_id}")
async def delete_promise_link(prid: str, link_id: str, request: Request,
                               user: dict = Depends(require_authenticated)):
    db = get_db()
    existing = await _get_promise_or_404(db, prid)
    _check_edit_auth(existing, user)

    await db.promises.update_one(
        {"_id": existing["_id"]},
        {"$pull": {"source_links": {"id": link_id}}, "$set": {"updated_at": utcnow_iso()}},
    )
    await audit_log(actor=user, action="promise_link_removed", entity_type="promise",
                     entity_id=prid, changed_fields={"link_id": link_id},
                     ip=_client_ip(request))
    return {"ok": True}


# ---------- File attachments ----------

@router.post("/promises/{prid}/files")
async def upload_promise_file(prid: str, request: Request,
                               file: UploadFile = File(...),
                               name: Optional[str] = Form(None),
                               user: dict = Depends(require_authenticated)):
    db = get_db()
    existing = await _get_promise_or_404(db, prid)
    _check_edit_auth(existing, user)

    url = await UploadService.save(file, subdir="promise_media")
    attachment = {
        "id": uuid.uuid4().hex,
        "name": (name or "").strip() or None,
        "url": url,
        "original_filename": file.filename,
        "file_type": _media_type_for(file.content_type),
        "uploaded_by": user.get("name") or user.get("email", "Unknown"),
        "created_at": utcnow_iso(),
    }
    await db.promises.update_one(
        {"_id": existing["_id"]},
        {"$push": {"files": attachment}, "$set": {"updated_at": utcnow_iso()}},
    )
    await audit_log(actor=user, action="promise_file_uploaded", entity_type="promise",
                     entity_id=prid, changed_fields={"file_id": attachment["id"], "filename": file.filename},
                     ip=_client_ip(request))
    return {"ok": True, "file": attachment}


@router.delete("/promises/{prid}/files/{file_id}")
async def delete_promise_file(prid: str, file_id: str, request: Request,
                               user: dict = Depends(require_authenticated)):
    db = get_db()
    existing = await _get_promise_or_404(db, prid)
    _check_edit_auth(existing, user)

    await db.promises.update_one(
        {"_id": existing["_id"]},
        {"$pull": {"files": {"id": file_id}}, "$set": {"updated_at": utcnow_iso()}},
    )
    await audit_log(actor=user, action="promise_file_removed", entity_type="promise",
                     entity_id=prid, changed_fields={"file_id": file_id},
                     ip=_client_ip(request))
    return {"ok": True}
