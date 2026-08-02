"""SEO metadata endpoints for SEO Management.

Persists/reads per-content-item SEO configuration (title, description,
canonical URL, slug, robots, OG/Twitter fields, structured data) in a
single `seo_configs` collection keyed by (content_type, content_id).

Design notes:
- Generated/default title & description are computed HERE, server-side,
  from the same templates the frontend's mock previously used (see
  CONTENT_TYPE_DEFAULTS below). They are recomputed on every read and are
  NEVER persisted — only the admin's custom override (value + is_custom)
  is stored. This keeps the "generated" values always in sync with the
  underlying content record, and means these same templates can later be
  reused verbatim by a Next.js `generateMetadata()` (or any other
  SSR layer) so the admin preview and the live page never disagree.
- Every write re-validates that the underlying content item exists and
  that this admin is authorized for it (e.g. regional scoping for
  politicians via can_access_politician) — the same check runs on GET
  and PUT, so authorization can never be bypassed by skipping a step the
  frontend happens to call first.
"""
from __future__ import annotations

import re

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field, field_validator

from routes import (
    get_db,
    require_section,
    can_access_politician,
    audit_log,
    utcnow_iso,
    _client_ip,
)
from addon_routes.deps import _oid

router = APIRouter(prefix="/api", tags=["seo"])

# =========================================================================
# CONTENT TYPE CONFIG — mirrors frontend/src/lib/seo/contentTypes.js.
# Keep these two files in sync when adding a content type.
# =========================================================================
CONTENT_TYPES = {"politicians", "countries", "articles", "static_pages"}

SCHEMA_TYPES = {
    "politicians": "Person",
    "countries": "Country",
    "articles": "NewsArticle",
    "static_pages": "WebPage",
}

CONTENT_TYPE_DEFAULTS = {
    "politicians": {
        "title_template": "{name} | {role}, {region} | TrackMP",
        "description_template": (
            "Track {name}'s promises, career history, and public record on "
            "TrackMP — independent political accountability tracking."
        ),
    },
    "countries": {
        "title_template": "{name} | Political Landscape & Governance | TrackMP",
        "description_template": (
            "Explore how {name}'s government works — structure, key offices, "
            "and political accountability, tracked on TrackMP."
        ),
    },
    "articles": {
        "title_template": "{title} | TrackMP",
        "description_template": "{title} — read the full story on TrackMP.",
    },
    "static_pages": {
        "title_template": "{name} | TrackMP",
        "description_template": (
            "{name} on TrackMP — independent political accountability tracking."
        ),
    },
}

# Static pages have no DB record. Keep this in sync with
# `static_pages.items` in the frontend's lib/seo/contentTypes.js — add an
# entry here when FAQ / Privacy Policy routes are built.
STATIC_PAGES = {
    "home": {"name": "Home Page"},
    "about": {"name": "About Us"},
}


def _resolve_template(template: str, tokens: dict) -> str:
    if not template:
        return ""
    return re.sub(r"\{(\w+)\}", lambda m: str(tokens.get(m.group(1), "")), template)


async def _resolve_item(db, content_type: str, content_id: str, user: dict) -> dict:
    """Confirms the underlying content item exists, enforces per-item
    authorization, and returns the token dict used to render default
    title/description templates. Raises 404/403 as appropriate."""
    if content_type == "politicians":
        doc = await db.politicians.find_one({"_id": _oid(content_id), "deleted_at": None})
        if not doc:
            raise HTTPException(status_code=404, detail="Politician not found")
        if not can_access_politician(user, doc):
            raise HTTPException(status_code=403, detail="No access to this politician's region")
        return {
            "name": doc.get("name", ""),
            "role": doc.get("role", ""),
            # No denormalized state name is stored on the politician doc,
            # so {region} falls back to country_code — a reasonable
            # default suggestion, not a precise claim.
            "region": doc.get("country_code", ""),
            "country": doc.get("country_code", ""),
        }

    if content_type == "countries":
        doc = await db.countries.find_one({"code": content_id, "deleted_at": None})
        if not doc:
            raise HTTPException(status_code=404, detail="Country not found")
        return {"name": doc.get("name", ""), "country": doc.get("code", "")}

    if content_type == "articles":
        doc = await db.articles.find_one({"_id": _oid(content_id), "deleted_at": None})
        if not doc:
            raise HTTPException(status_code=404, detail="Article not found")
        return {"title": doc.get("title", ""), "name": doc.get("title", "")}

    if content_type == "static_pages":
        page = STATIC_PAGES.get(content_id)
        if not page:
            raise HTTPException(status_code=404, detail="Unknown static page")
        return {"name": page["name"]}

    raise HTTPException(status_code=400, detail=f"Unknown content type: {content_type}")


def _build_response(content_type: str, content_id: str, tokens: dict, persisted: dict | None) -> dict:
    defaults = CONTENT_TYPE_DEFAULTS.get(content_type, {})
    generated_title = _resolve_template(defaults.get("title_template", ""), tokens)
    generated_description = _resolve_template(defaults.get("description_template", ""), tokens)

    base = persisted or {}
    basic = base.get("basic", {}) or {}
    social = base.get("social", {}) or {}
    structured = base.get("structured_data", {}) or {}
    title_field = basic.get("title", {}) or {}
    desc_field = basic.get("description", {}) or {}
    og = social.get("og", {}) or {}
    twitter = social.get("twitter", {}) or {}

    return {
        "content_type": content_type,
        "content_id": content_id,
        "basic": {
            "title": {
                "value": title_field.get("value", ""),
                "is_custom": title_field.get("is_custom", False),
                "generated_value": generated_title,
            },
            "description": {
                "value": desc_field.get("value", ""),
                "is_custom": desc_field.get("is_custom", False),
                "generated_value": generated_description,
            },
            "canonical_url": basic.get("canonical_url", ""),
            "slug": basic.get("slug", ""),
            "robots": basic.get("robots") or {"index": True, "follow": True},
        },
        "social": {
            "og": {
                "title": og.get("title", ""),
                "description": og.get("description", ""),
                "image_url": og.get("image_url", ""),
            },
            "twitter": {
                "title": twitter.get("title", ""),
                "description": twitter.get("description", ""),
                "image_url": twitter.get("image_url", ""),
                "card_type": twitter.get("card_type", "summary_large_image"),
            },
        },
        "structured_data": {
            "schema_type": structured.get("schema_type") or SCHEMA_TYPES.get(content_type, "Thing"),
            "fields": structured.get("fields", {}),
        },
        "meta": {
            "updated_at": base.get("updated_at"),
            "updated_by": base.get("updated_by"),
            "is_mocked": False,
        },
    }


# =========================================================================
# REQUEST MODELS — server-side re-validation of everything the frontend
# already validates client-side. Never trust the client.
# =========================================================================
_URL_RE = re.compile(r"^https?://", re.IGNORECASE)
_SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


class TitleFieldIn(BaseModel):
    value: str = Field("", max_length=200)
    is_custom: bool = False


class DescriptionFieldIn(BaseModel):
    value: str = Field("", max_length=400)
    is_custom: bool = False


class RobotsIn(BaseModel):
    index: bool = True
    follow: bool = True


class BasicSEOIn(BaseModel):
    title: TitleFieldIn = TitleFieldIn()
    description: DescriptionFieldIn = DescriptionFieldIn()
    canonical_url: str = Field("", max_length=500)
    slug: str = Field("", max_length=200)
    robots: RobotsIn = RobotsIn()

    @field_validator("canonical_url")
    @classmethod
    def _validate_canonical(cls, v):
        if v and not _URL_RE.match(v):
            raise ValueError("canonical_url must be a valid http(s) URL")
        return v

    @field_validator("slug")
    @classmethod
    def _validate_slug(cls, v):
        if v and not _SLUG_RE.match(v):
            raise ValueError("slug must be lowercase letters, numbers, and hyphens only")
        return v


class OGIn(BaseModel):
    title: str = Field("", max_length=200)
    description: str = Field("", max_length=400)
    image_url: str = Field("", max_length=500)

    @field_validator("image_url")
    @classmethod
    def _validate_image_url(cls, v):
        if v and not _URL_RE.match(v):
            raise ValueError("image_url must be a valid http(s) URL")
        return v


class TwitterIn(OGIn):
    card_type: str = Field("summary_large_image", max_length=50)


class SocialSEOIn(BaseModel):
    og: OGIn = OGIn()
    twitter: TwitterIn = TwitterIn()


class StructuredDataIn(BaseModel):
    schema_type: str = Field("", max_length=50)
    fields: dict = Field(default_factory=dict)

    @field_validator("fields")
    @classmethod
    def _validate_fields(cls, v):
        if len(v) > 30:
            raise ValueError("Too many structured data fields")
        for key, val in v.items():
            if isinstance(val, list):
                if len(val) > 20 or any(not isinstance(x, str) or len(x) > 500 for x in val):
                    raise ValueError(f"Invalid list value for field '{key}'")
            elif isinstance(val, str):
                if len(val) > 500:
                    raise ValueError(f"Field '{key}' is too long")
            else:
                raise ValueError(f"Field '{key}' must be a string or list of strings")
        return v


class SEOConfigIn(BaseModel):
    basic: BasicSEOIn = BasicSEOIn()
    social: SocialSEOIn = SocialSEOIn()
    structured_data: StructuredDataIn = StructuredDataIn()


# =========================================================================
# ROUTES
# =========================================================================
@router.get("/admin/seo/{content_type}/{content_id}")
async def get_seo_config(
    content_type: str,
    content_id: str,
    user: dict = Depends(require_section("seo_management")),
):
    if content_type not in CONTENT_TYPES:
        raise HTTPException(status_code=400, detail=f"Unknown content type: {content_type}")
    db = get_db()
    tokens = await _resolve_item(db, content_type, content_id, user)
    persisted = await db.seo_configs.find_one(
        {"content_type": content_type, "content_id": content_id, "deleted_at": None}
    )
    return _build_response(content_type, content_id, tokens, persisted)


@router.put("/admin/seo/{content_type}/{content_id}")
async def save_seo_config(
    content_type: str,
    content_id: str,
    payload: SEOConfigIn,
    request: Request,
    user: dict = Depends(require_section("seo_management")),
):
    if content_type not in CONTENT_TYPES:
        raise HTTPException(status_code=400, detail=f"Unknown content type: {content_type}")
    db = get_db()
    # Re-checked on every save, not just on the first GET — an admin's
    # access to this item, or the item itself, may have changed since.
    tokens = await _resolve_item(db, content_type, content_id, user)

    now = utcnow_iso()
    # Note: generated_value is intentionally NOT persisted here — it's
    # recomputed from the live content record on every read.
    update_fields = {
        "content_type": content_type,
        "content_id": content_id,
        "basic": payload.basic.model_dump(),
        "social": payload.social.model_dump(),
        "structured_data": payload.structured_data.model_dump(),
        "updated_at": now,
        "updated_by": {
            "id": str(user.get("_id") or user.get("id") or ""),
            "email": user.get("email"),
        },
        "deleted_at": None,
    }
    await db.seo_configs.update_one(
        {"content_type": content_type, "content_id": content_id},
        {"$set": update_fields, "$setOnInsert": {"created_at": now}},
        upsert=True,
    )
    await audit_log(
        actor=user,
        action="seo_config_saved",
        entity_type=f"seo:{content_type}",
        entity_id=content_id,
        changed_fields={"basic": update_fields["basic"], "social": update_fields["social"]},
        ip=_client_ip(request),
    )
    persisted = await db.seo_configs.find_one(
        {"content_type": content_type, "content_id": content_id}
    )
    return _build_response(content_type, content_id, tokens, persisted)


@router.get("/admin/seo/{content_type}")
async def list_seo_status(
    content_type: str,
    user: dict = Depends(require_section("seo_management")),
):
    """Bulk view: which content_ids of this type already have a saved SEO
    config. Intentionally NOT a full item listing — that already exists
    via /admin/politicians, /ref/countries, /admin/articles. This is a
    building block for a future 'find missing SEO' screen."""
    if content_type not in CONTENT_TYPES:
        raise HTTPException(status_code=400, detail=f"Unknown content type: {content_type}")
    db = get_db()
    cursor = db.seo_configs.find(
        {"content_type": content_type, "deleted_at": None},
        {"content_id": 1, "updated_at": 1},
    )
    docs = await cursor.to_list(2000)
    return {"items": [{"content_id": d["content_id"], "updated_at": d.get("updated_at")} for d in docs]}
