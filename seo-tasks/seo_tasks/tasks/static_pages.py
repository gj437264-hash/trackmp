"""
Generates static HTML profile pages for each politician, for crawler visibility.
Only regenerates pages for politicians whose own record changed, OR whose
SEO config (seo_configs collection, written by addon_routes/seo_metadata.py)
changed, since the last run.

IMPORTANT: title/description generation templates below are duplicated
from addon_routes/seo_metadata.py::CONTENT_TYPE_DEFAULTS by necessity —
this script runs standalone, outside FastAPI/request context, so it can't
import that module's route dependencies. If you change the politician
title/description templates in seo_metadata.py, mirror the change here or
the static page and the live admin preview will disagree.
"""
import os
import json
import logging
import re
from datetime import datetime, timezone
from xml.sax.saxutils import escape as xml_escape

from ..db import get_db
from ..config import load_settings
from ..atomic_write import atomic_write
from ..state import get_last_run, set_last_run
from ..retry import retry
from pymongo.errors import PyMongoError

log = logging.getLogger(__name__)

TASK_NAME = "static_pages"
BATCH_SIZE = 2000

# Mirrors addon_routes/seo_metadata.py::CONTENT_TYPE_DEFAULTS["politicians"].
# Keep in sync manually — see module docstring.
TITLE_TEMPLATE = "{name} | {role}, {region} | TrackMP"
DESCRIPTION_TEMPLATE = (
    "Track {name}'s promises, career history, and public record on "
    "TrackMP — independent political accountability tracking."
)
DEFAULT_SCHEMA_TYPE = "Person"

TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>{page_title}</title>
  <meta name="description" content="{description}">
  <meta name="robots" content="{robots_content}">
  <link rel="canonical" href="{canonical_url}">

  <meta property="og:title" content="{og_title}">
  <meta property="og:description" content="{og_description}">
  <meta property="og:type" content="profile">
  <meta property="og:url" content="{canonical_url}">
  <meta property="og:image" content="{og_image}">

  <meta name="twitter:card" content="{twitter_card}">
  <meta name="twitter:title" content="{twitter_title}">
  <meta name="twitter:description" content="{twitter_description}">
  <meta name="twitter:image" content="{twitter_image}">

  <script type="application/ld+json">
  {structured_data_json}
  </script>
  <script>window.__PRELOADED_POLITICIAN__ = {preloaded_json};</script>
  <script defer src="/static/js/main.bundle.js"></script>
</head>
<body>
  <div id="root">
    <h1>{name}</h1>
    <p>{role_region}</p>
    <p>{description}</p>
  </div>
</body>
</html>
"""


def _safe_slug(slug: str) -> bool:
    """Guards against path traversal if a slug was ever hand-edited in Mongo."""
    return bool(re.fullmatch(r"[a-z0-9-]+", slug or ""))


def _resolve_template(template: str, tokens: dict) -> str:
    if not template:
        return ""
    return re.sub(r"\{(\w+)\}", lambda m: str(tokens.get(m.group(1), "")), template)


def _resolve_field(field: dict) -> str:
    """Mirrors the frontend's resolution rule in SEOEditor.jsx:
    config.basic.title.is_custom ? value : generated_value — no truthiness
    check on value, matching the live admin preview exactly."""
    field = field or {}
    return field.get("value", "") if field.get("is_custom") else field.get("generated_value", "")


def _clean(value):
    """Recursively converts ObjectId/datetime for JSON serialization.
    Reuse the existing helper from the audit-log fix if one is already
    importable in this codebase instead of this local copy."""
    from bson import ObjectId
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, dict):
        return {k: _clean(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_clean(v) for v in value]
    return value


def _seo_last_run_str(last_run) -> str | None:
    """seo_configs.updated_at is stored as an ISO string (utcnow_iso()),
    while `last_run` from get_last_run() is a datetime — comparing them
    directly against a string-typed field returns nothing (BSON type
    ordering puts Date above String). Convert explicitly for that query."""
    if last_run is None:
        return None
    if isinstance(last_run, datetime):
        return last_run.isoformat()
    return str(last_run)


def build_page(doc, seo_cfg, base_url: str, output_dir: str):
    # Output path is always keyed on the politician's REAL routing slug,
    # never the SEO editor's `basic.slug` override — those are separate
    # fields and only the real one matches what the live SPA/backend serve.
    slug = doc.get("slug") or str(doc["_id"])
    if not _safe_slug(slug):
        log.warning(f"Skipping doc {doc['_id']}: unsafe slug {slug!r}")
        return False

    name = doc.get("name", "")
    role = doc.get("role", "")
    region = doc.get("country_code", "")  # matches seo_metadata.py's token mapping
    tokens = {"name": name, "role": role, "region": region, "country": region}

    generated_title = _resolve_template(TITLE_TEMPLATE, tokens)
    generated_description = _resolve_template(DESCRIPTION_TEMPLATE, tokens)

    basic = (seo_cfg or {}).get("basic", {}) or {}
    social = (seo_cfg or {}).get("social", {}) or {}
    structured = (seo_cfg or {}).get("structured_data", {}) or {}
    robots = basic.get("robots") or {"index": True, "follow": True}
    og = social.get("og", {}) or {}
    twitter = social.get("twitter", {}) or {}

    title_field = {**(basic.get("title") or {}), "generated_value": generated_title}
    desc_field = {**(basic.get("description") or {}), "generated_value": generated_description}
    resolved_title = _resolve_field(title_field) or generated_title
    resolved_description = _resolve_field(desc_field) or generated_description

    canonical_url = basic.get("canonical_url") or f"{base_url}/politicians/{slug}"
    photo_url = doc.get("photo_url", f"{base_url}/default-avatar.png")
    og_image = og.get("image_url") or photo_url
    twitter_image = twitter.get("image_url") or og_image

    robots_content = ", ".join([
        "index" if robots.get("index", True) else "noindex",
        "follow" if robots.get("follow", True) else "nofollow",
    ])

    schema_type = structured.get("schema_type") or DEFAULT_SCHEMA_TYPE
    ld_json = {
        "@context": "https://schema.org",
        "@type": schema_type,
        "name": name,
        "jobTitle": role,
        "url": canonical_url,
        "image": og_image,
    }
    ld_json.update(structured.get("fields") or {})  # nationality, birthDate, sameAs, etc.

    html = TEMPLATE.format(
        page_title=xml_escape(resolved_title),
        description=xml_escape(resolved_description),
        robots_content=robots_content,
        canonical_url=canonical_url,
        og_title=xml_escape(og.get("title") or resolved_title),
        og_description=xml_escape(og.get("description") or resolved_description),
        og_image=og_image,
        twitter_card=twitter.get("card_type") or "summary_large_image",
        twitter_title=xml_escape(twitter.get("title") or og.get("title") or resolved_title),
        twitter_description=xml_escape(
            twitter.get("description") or og.get("description") or resolved_description
        ),
        twitter_image=twitter_image,
        structured_data_json=json.dumps(_clean(ld_json)),
        preloaded_json=json.dumps({"politician": _clean(doc), "seo": _clean(seo_cfg or {})}),
        name=xml_escape(name),
        role_region=xml_escape(f"{role}, {region}".strip(", ")),
    )

    page_dir = os.path.join(output_dir, slug)
    os.makedirs(page_dir, exist_ok=True)
    atomic_write(os.path.join(page_dir, "index.html"), html)
    return True


@retry(exceptions=(PyMongoError,), attempts=3, base_delay=2)
def run() -> bool:
    settings = load_settings()
    db = get_db()
    politicians = db["politicians"]
    seo_configs = db["seo_configs"]

    last_run = get_last_run(TASK_NAME)
    pol_query = {"updatedAt": {"$gt": last_run}} if last_run else {}

    seo_last_run_str = _seo_last_run_str(last_run)
    seo_query = {"content_type": "politicians", "deleted_at": None}
    if seo_last_run_str:
        seo_query["updated_at"] = {"$gt": seo_last_run_str}

    changed_ids = {doc["_id"] for doc in politicians.find(pol_query, {"_id": 1})}
    # content_id in seo_configs is a STRING (str(ObjectId)) — see
    # seo_metadata.py / contentTypes.js getItemId — convert back to ObjectId.
    from bson import ObjectId
    for cfg in seo_configs.find(seo_query, {"content_id": 1}):
        try:
            changed_ids.add(ObjectId(cfg["content_id"]))
        except Exception:
            log.warning(f"Skipping seo_configs doc with unparseable content_id: {cfg.get('content_id')!r}")

    total = len(changed_ids)
    log.info(f"Politicians to (re)generate: {total}")
    if total == 0:
        log.info("Nothing changed since last run.")
        return True

    projection = {"_id": 1, "slug": 1, "name": 1, "role": 1,
                  "country_code": 1, "photo_url": 1}

    cfg_by_id = {}
    for cfg in seo_configs.find(
        {"content_type": "politicians", "content_id": {"$in": [str(i) for i in changed_ids]},
         "deleted_at": None}
    ):
        try:
            cfg_by_id[ObjectId(cfg["content_id"])] = cfg
        except Exception:
            continue

    count = 0
    for doc in politicians.find({"_id": {"$in": list(changed_ids)}}, projection).batch_size(BATCH_SIZE):
        if build_page(doc, cfg_by_id.get(doc["_id"]), settings.base_url, settings.static_output_dir):
            count += 1

    set_last_run(TASK_NAME)
    log.info(f"Generated {count} static politician pages")
    return True
