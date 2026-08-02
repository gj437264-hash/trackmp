"""Admin moderation endpoints for the Voice discussion system."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request

from db import get_db, utcnow_iso
from models import BlockedIpIn
from addon_routes.deps import _oid, _clean, require_section

router = APIRouter(prefix="/api/admin/voice", tags=["admin-voice"])


def _shape(c, article_id: str):
    from security import voice_anon_label
    return {
        "id": str(c["_id"]),
        "article_id": c["article_id"],
        "parent_id": str(c["parent_id"]) if c.get("parent_id") else None,
        "anon_label": voice_anon_label(c["anon_session_id"], c["article_id"]),
        "body": c["body"],
        "ip": c.get("ip", "unknown"),
        "hidden": c.get("hidden", False),
        "date": c["created_at"],
        "edited": c.get("edited", False),
        "upvotes": c.get("upvotes", 0),
        "downvotes": c.get("downvotes", 0),
        "report_count": len(c.get("reports", [])),
        "reports": [
            {"reason": r["reason"], "date": r["created_at"]}
            for r in c.get("reports", [])
        ],
    }


@router.get("/discussions")
async def list_all(user: dict = Depends(require_section("voice"))):
    db = get_db()
    comments = await db.voice_comments.find({"deleted_at": None}).sort("created_at", -1).to_list(2000)

    articles = await db.articles.find(
        {"article_id": {"$in": list({c["article_id"] for c in comments})}}
    ).to_list(1000)
    titles = {a["article_id"]: a.get("title", "") for a in articles}

    grouped = {}
    for c in comments:
        aid = c["article_id"]
        grouped.setdefault(aid, {"articleId": aid, "articleTitle": titles.get(aid, aid), "comments": []})

    top_level = {}
    for c in comments:
        item = _shape(c, c["article_id"])
        if c.get("parent_id") is None:
            item["replies"] = []
            top_level[str(c["_id"])] = item
            grouped[c["article_id"]]["comments"].append(item)

    for c in comments:
        if c.get("parent_id") is not None:
            parent = top_level.get(str(c["parent_id"]))
            if parent:
                parent["replies"].append(_shape(c, c["article_id"]))

    return list(grouped.values())


@router.patch("/comments/{comment_id}")
async def toggle_hidden(comment_id: str, request: Request, user: dict = Depends(require_section("voice"))):
    db = get_db()
    body = await request.json()
    hidden = bool(body.get("hidden"))
    result = await db.voice_comments.update_one(
        {"_id": _oid(comment_id), "deleted_at": None},
        {"$set": {"hidden": hidden, "updated_at": utcnow_iso()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Comment not found")
    return {"ok": True}


@router.delete("/comments/{comment_id}")
async def delete_comment(comment_id: str, user: dict = Depends(require_section("voice"))):
    db = get_db()
    result = await db.voice_comments.update_one(
        {"_id": _oid(comment_id), "deleted_at": None},
        {"$set": {"deleted_at": utcnow_iso()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Comment not found")
    return {"ok": True}


@router.delete("/comments/{comment_id}/reports")
async def dismiss_reports(comment_id: str, user: dict = Depends(require_section("voice"))):
    db = get_db()
    result = await db.voice_comments.update_one(
        {"_id": _oid(comment_id)},
        {"$set": {"reports": []}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Comment not found")
    return {"ok": True}


# ---- IP blocklist management ----

#@router.get("/blocked-ips")
#async def list_blocked_ips(user: dict = Depends(require_section("voice"))):
#    db = get_db()
#    rows = await db.blocked_ips.find().sort("created_at", -1).to_list(500)
#    return [_clean(r) for r in rows]

@router.get("/blocked-ips")
async def list_blocked_ips(user: dict = Depends(require_section("voice"))):
    db = get_db()
    rows = await db.blocked_ips.find().sort("created_at", -1).to_list(500)
    return [
        {
            "id": str(r["_id"]),
            "ip": r["ip"],
            "reason": r.get("reason", ""),
            "created_at": r.get("created_at"),
            "created_by": r.get("created_by"),
        }
        for r in rows
    ]

@router.post("/blocked-ips")
async def block_ip(payload: BlockedIpIn, user: dict = Depends(require_section("voice"))):
    db = get_db()
    existing = await db.blocked_ips.find_one({"ip": payload.ip})
    if existing:
        return {"ok": True, "id": str(existing["_id"])}
    doc = {
        "ip": payload.ip,
        "reason": payload.reason or "",
        "created_at": utcnow_iso(),
        "created_by": user.get("email"),
    }
    result = await db.blocked_ips.insert_one(doc)
    return {"ok": True, "id": str(result.inserted_id)}


@router.delete("/blocked-ips/{ip_id}")
async def unblock_ip(ip_id: str, user: dict = Depends(require_section("voice"))):
    db = get_db()
    result = await db.blocked_ips.delete_one({"_id": _oid(ip_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}
