"""Public voice/discussion endpoints — anonymous commenting with
server-side sanitization, rate limiting, and IP blocking."""
from __future__ import annotations

import bleach
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, Response

from db import get_db, utcnow_iso
from models import VoiceCommentIn, VoiceReportIn
from addon_routes.deps import _oid, _clean, NOT_DELETED, get_or_create_voice_session, voice_anon_label, check_ip_not_blocked

router = APIRouter(prefix="/api/voice", tags=["voice"])

MAX_COMMENTS_PER_WINDOW = 5
WINDOW_MINUTES = 5
MIN_SECONDS_BEFORE_SUBMIT = 2  # soft anti-bot heuristic, not a hard boundary


def _sanitize(text: str) -> str:
    # Strip ALL tags server-side. Client-side DOMPurify is a UX affordance
    # only — this is the actual security boundary.
    cleaned = bleach.clean(text or "", tags=[], attributes={}, strip=True)
    return cleaned.strip()[:500]


async def _rate_limit_check(db, session_id: str, ip: str):
    cutoff = (datetime.now(timezone.utc) - timedelta(minutes=WINDOW_MINUTES)).isoformat()
    count = await db.voice_comments.count_documents({
        "$or": [{"anon_session_id": session_id}, {"ip": ip}],
        "created_at": {"$gte": cutoff},
    })
    if count >= MAX_COMMENTS_PER_WINDOW:
        raise HTTPException(status_code=429, detail="Too many comments — please slow down")


def _is_likely_bot(payload: VoiceCommentIn) -> bool:
    if payload.website:  # honeypot field — real users never fill this
        return True
    if payload.form_rendered_at:
        try:
            rendered = datetime.fromisoformat(payload.form_rendered_at.replace("Z", "+00:00"))
            elapsed = (datetime.now(timezone.utc) - rendered).total_seconds()
            if elapsed < MIN_SECONDS_BEFORE_SUBMIT:
                return True
        except ValueError:
            pass
    return False

@router.get("/discussions")
async def list_discussions():
    db = get_db()
    pipeline = [
        {"$match": {"deleted_at": None, "hidden": False}},
        {"$group": {"_id": "$article_id", "comment_count": {"$sum": 1}}},
    ]
    counts = await db.voice_comments.aggregate(pipeline).to_list(1000)
    if not counts:
        return []

    article_ids = [c["_id"] for c in counts]
    articles = await db.articles.find(
        {"article_id": {"$in": article_ids}, "status": "published", "deleted_at": None}
    ).to_list(1000)
    titles = {a["article_id"]: a.get("title", "") for a in articles}

    return [
        {"article_id": c["_id"], "article_title": titles.get(c["_id"], c["_id"]), "comment_count": c["comment_count"]}
        for c in counts
        if c["_id"] in titles
    ]

@router.get("/discussions/{article_id}")
async def get_discussion(article_id: str, request: Request, response: Response):
    db = get_db()
    session_id = get_or_create_voice_session(request, response)

    comments = await db.voice_comments.find({
        "article_id": article_id,
        "parent_id": None,
        "deleted_at": None,
    }).sort("created_at", 1).to_list(500)

    replies = await db.voice_comments.find({
        "article_id": article_id,
        "parent_id": {"$ne": None},
        "deleted_at": None,
    }).sort("created_at", 1).to_list(1000)

    replies_by_parent = {}
    for r in replies:
        replies_by_parent.setdefault(str(r["parent_id"]), []).append(r)

    def shape(c):
        return {
            "id": str(c["_id"]),
            "anon_label": voice_anon_label(c["anon_session_id"], article_id),
            "body": None if c.get("hidden") else c["body"],
            "hidden": c.get("hidden", False),
            "date": c["created_at"],
            "edited": c.get("edited", False),
            "upvotes": c.get("upvotes", 0),
            "downvotes": c.get("downvotes", 0),
            "is_mine": c["anon_session_id"] == session_id,
        }

    out = []
    for c in comments:
        item = shape(c)
        item["replies"] = [shape(r) for r in replies_by_parent.get(str(c["_id"]), [])]
        out.append(item)

    return {"article_id": article_id, "comments": out}


@router.post("/discussions/{article_id}/comments")
async def post_comment(
    article_id: str,
    payload: VoiceCommentIn,
    request: Request,
    response: Response,
    ip: str = Depends(check_ip_not_blocked),
):
    db = get_db()
    session_id = get_or_create_voice_session(request, response)

    if _is_likely_bot(payload):
        # Return a fake success so bots don't learn their submission was
        # dropped — never actually persist it.
        return {"ok": True, "id": None}

    await _rate_limit_check(db, session_id, ip)

    body = _sanitize(payload.body)
    if not body:
        raise HTTPException(status_code=400, detail="Comment cannot be empty")

    parent_oid = None
    if payload.parent_id:
        parent_oid = _oid(payload.parent_id)
        parent = await db.voice_comments.find_one({"_id": parent_oid, "deleted_at": None})
        if not parent or parent["article_id"] != article_id:
            raise HTTPException(status_code=404, detail="Parent comment not found")

    now = utcnow_iso()
    doc = {
        "article_id": article_id,
        "parent_id": parent_oid,
        "body": body,
        "anon_session_id": session_id,
        "ip": ip,
        "hidden": False,
        "deleted_at": None,
        "upvotes": 0,
        "downvotes": 0,
        "reports": [],
        "edited": False,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.voice_comments.insert_one(doc)
    return {"ok": True, "id": str(result.inserted_id)}

@router.patch("/comments/{comment_id}")
async def edit_comment(
    comment_id: str,
    payload: VoiceCommentIn,
    request: Request,
    response: Response,
):
    db = get_db()
    session_id = get_or_create_voice_session(request, response)

    comment = await db.voice_comments.find_one({"_id": _oid(comment_id), "deleted_at": None})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment["anon_session_id"] != session_id:
        raise HTTPException(status_code=403, detail="You can only edit your own comment")

    body = _sanitize(payload.body)
    if not body:
        raise HTTPException(status_code=400, detail="Comment cannot be empty")

    await db.voice_comments.update_one(
        {"_id": comment["_id"]},
        {"$set": {"body": body, "edited": True, "updated_at": utcnow_iso()}},
    )
    return {"ok": True}

@router.post("/comments/{comment_id}/report")
async def report_comment(
    comment_id: str,
    payload: VoiceReportIn,
    request: Request,
    response: Response,
    ip: str = Depends(check_ip_not_blocked),
):
    db = get_db()
    session_id = get_or_create_voice_session(request, response)
    reason = _sanitize(payload.reason)[:200]
    if not reason:
        raise HTTPException(status_code=400, detail="Reason cannot be empty")

    comment = await db.voice_comments.find_one({"_id": _oid(comment_id), "deleted_at": None})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    # Prevent the same session from reporting the same comment repeatedly
    already = any(r.get("reporter_session_id") == session_id for r in comment.get("reports", []))
    if already:
        return {"ok": True}

    await db.voice_comments.update_one(
        {"_id": comment["_id"]},
        {"$push": {"reports": {
            "reason": reason,
            "reporter_session_id": session_id,
            "created_at": utcnow_iso(),
        }}},
    )
    return {"ok": True}
