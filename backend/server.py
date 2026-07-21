"""TrackMP FastAPI application entrypoint."""
from __future__ import annotations

import logging
import os
from pathlib import Path

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from countries import COUNTRIES
from db import close_db, get_db, utcnow_iso
from routes import router as api_router
from security import hash_password, verify_password
from image_router import router as image_router, init_image_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
log = logging.getLogger("trackmp")

app = FastAPI(title="TrackMP")


# =========================================================================
# STARTUP
# =========================================================================
async def _seed_countries(db):
    existing = await db.countries.count_documents({})
    if existing >= len(COUNTRIES):
        return
    now = utcnow_iso()
    for code, name in COUNTRIES:
        if await db.countries.find_one({"code": code}):
            continue
        await db.countries.insert_one(
            {"code": code, "name": name, "created_at": now, "updated_at": now, "deleted_at": None}
        )
    log.info("Seeded %d countries", len(COUNTRIES))


async def _seed_super_admin(db):
    email = os.environ["SUPER_ADMIN_EMAIL"].lower().strip()
    password = os.environ["SUPER_ADMIN_PASSWORD"]
    now = utcnow_iso()
    existing = await db.users.find_one({"email": email})
    if existing is None:
        await db.users.insert_one(
            {
                "email": email,
                "name": "Super Admin",
                "role": "super_admin",
                "password_hash": hash_password(password),
                "country_code": None,
                "created_at": now,
                "updated_at": now,
                "deleted_at": None,
            }
        )
        log.info("Super admin seeded: %s", email)
        return
    updates: dict = {}
    if existing.get("role") != "super_admin":
        updates["role"] = "super_admin"
    if not verify_password(password, existing.get("password_hash", "")):
        updates["password_hash"] = hash_password(password)
    if existing.get("deleted_at") is not None:
        updates["deleted_at"] = None
    if updates:
        updates["updated_at"] = now
        await db.users.update_one({"_id": existing["_id"]}, {"$set": updates})
        log.info("Super admin updated: %s (fields=%s)", email, list(updates))


async def _create_indexes(db):
    await db.users.create_index("email", unique=True)
    await db.signup_requests.create_index("email")
    await db.signup_requests.create_index("status")
    await db.invite_tokens.create_index("token", unique=True)
    await db.password_reset_tokens.create_index("token", unique=True)
    await db.countries.create_index("code")
    await db.states.create_index("country_code")
    await db.cities.create_index("state_id")
    await db.constituencies.create_index("state_id")
    await db.politicians.create_index("name")
    await db.politicians.create_index("country_code")
    await db.relatives.create_index("politician_id")
    await db.wealth_entries.create_index("politician_id")
    await db.wealth_entries.create_index("relative_id")
    await db.audit_events.create_index("timestamp")
    await db.audit_events.create_index("entity_type")
    await db.position_history.create_index("politician_id")
    await db.position_history.create_index(
        [("country_code", 1), ("state_id", 1), ("city_id", 1), ("constituency_id", 1), ("position", 1), ("is_current", 1)]
    )
    await db.position_history.create_index("election_year")
    await db.promises.create_index("politician_id")
    await db.promises.create_index("status")
    await db.tickets.create_index("ticket_number", unique=True)
    await db.tickets.create_index("status")
    await db.tickets.create_index("type")
    await db.tickets.create_index("visitor_id")
    await db.contacts.create_index("ticket_id")
    await db.update_requests.create_index("ticket_id")
    await db.update_requests.create_index("politician_id")
    await db.visitors.create_index("email", unique=True)
    await db.ticket_attachments.create_index("ticket_id")
    await db.ticket_activity_logs.create_index("ticket_id")
    await db.notifications.create_index("status")
    await db.notifications.create_index("ticket_id")
    await db.articles.create_index("article_id", unique=True)
    await db.articles.create_index("status")
    await db.articles.create_index("tags")
    await db.article_media.create_index("article_id")


@app.on_event("startup")
async def on_startup():
    db = get_db()
    await _create_indexes(db)
    await _seed_countries(db)
    await _seed_super_admin(db)
    upload_dir = os.environ.get("UPLOAD_DIR", "/app/backend/uploads")
    Path(upload_dir).mkdir(parents=True, exist_ok=True)
    init_image_router(db)


@app.on_event("shutdown")
async def on_shutdown():
    close_db()


# =========================================================================
# MIDDLEWARE + ROUTES + STATIC
# =========================================================================
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.include_router(api_router)
app.include_router(image_router, prefix="/api/images", tags=["images"])   # NEW

_upload_dir = os.environ.get("UPLOAD_DIR", "/app/backend/uploads")
Path(_upload_dir).mkdir(parents=True, exist_ok=True)
app.mount("/api/uploads", StaticFiles(directory=_upload_dir), name="uploads")


@app.get("/api/health")
async def health():
    return {"status": "ok"}
