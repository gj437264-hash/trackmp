"""
One-time-safe, re-runnable migration to backfill `slug` field
on politician documents. Does NOT touch _id or any other field.
"""

import re
import unicodedata
import logging
from ..db import get_db
from ..retry import retry
from pymongo.errors import PyMongoError

log = logging.getLogger(__name__)
BATCH_SIZE = 500


def slugify(name: str) -> str:
    if not name:
        return "politician"
    normalized = unicodedata.normalize("NFKD", name)
    ascii_name = normalized.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_name.lower()).strip("-")
    return slug or "politician"


def unique_slug_for(politicians, base_slug, doc_id, existing_cache):
    candidate = base_slug
    suffix = 2
    while candidate in existing_cache or politicians.find_one(
        {"slug": candidate, "_id": {"$ne": doc_id}}, {"_id": 1}
    ):
        candidate = f"{base_slug}-{suffix}"
        suffix += 1
    return candidate


@retry(exceptions=(PyMongoError,), attempts=3, base_delay=2)
def run() -> bool:
    db = get_db()
    politicians = db["politicians"]

    query = {"$or": [{"slug": {"$exists": False}}, {"slug": None}, {"slug": ""}]}
    projection = {"_id": 1, "name": 1}

    total = politicians.count_documents(query)
    log.info(f"Documents missing a slug: {total}")
    if total == 0:
        log.info("Nothing to do.")
        return True

    existing = set()
    processed = 0
    for doc in politicians.find(query, projection).batch_size(BATCH_SIZE):
        base = slugify(doc.get("name", ""))
        final_slug = unique_slug_for(politicians, base, doc["_id"], existing)
        existing.add(final_slug)
        politicians.update_one(
            {"_id": doc["_id"], "slug": {"$in": [None, ""]}},
            {"$set": {"slug": final_slug}},
        )
        processed += 1

    log.info(f"Done. {processed} documents processed.")
    return True
