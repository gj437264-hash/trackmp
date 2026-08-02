"""TrackMP FastAPI application entrypoint."""
from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from pymongo import UpdateOne

from rate_limit import limiter
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from countries import COUNTRIES
from db import close_db, get_db, utcnow_iso
from routes import router as api_router
from security import hash_password, verify_password
from image_router import router as image_router, init_image_router
from addon_routes.voice import router as voice_router
from addon_routes.admin_voice import router as admin_voice_router
from addon_routes.politician_verification import router as politician_verification_router
from addon_routes.politician_filters import router as politician_filters_router
from addon_routes.promise_attachments import router as promise_attachments_router
from addon_routes.admin_super import router as admin_super_router
from addon_routes.seo_metadata import router as seo_metadata_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
log = logging.getLogger("trackmp")


# =========================================================================
# RATE LIMITER
# Uses security.py's _client_ip_from_request logic implicitly via
# X-Real-IP -- slowapi's get_remote_address reads request.client.host,
# which is the direct TCP peer (nginx, in your setup) not the real
# visitor. Swap in a custom key_func that reads X-Real-IP so limits are
# applied per real visitor, not collectively to "nginx".
# =========================================================================
#def _rate_limit_key(request):
#    real_ip = request.headers.get("x-real-ip")
#    if real_ip:
#        return real_ip.strip()
#    return get_remote_address(request)


#limiter = Limiter(key_func=_rate_limit_key)

#app = FastAPI(title="TrackMP", lifespan=lifespan)
#app.state.limiter = limiter
#app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# =========================================================================
# STARTUP / SHUTDOWN (lifespan)
# =========================================================================
async def _seed_countries(db):
    existing = await db.countries.count_documents({})
    if existing >= len(COUNTRIES):
        return
    now = utcnow_iso()
    ops = [
        UpdateOne(
            {"code": code},
            {"$setOnInsert": {
                "code": code,
                "name": name,
                "created_at": now,
                "updated_at": now,
                "deleted_at": None,
            }},
            upsert=True,
        )
        for code, name in COUNTRIES
    ]
    if ops:
        result = await db.countries.bulk_write(ops, ordered=False)
        log.info("Seeded %d countries", result.upserted_count)


async def _seed_super_admin(db):
    """One-time bootstrap only. Runs only when NO super_admin exists yet in
    the DB, and only if SUPER_ADMIN_EMAIL/SUPER_ADMIN_PASSWORD are present
    in the environment. Never overwrites an existing user's password on
    restart -- password changes must go through /auth/reset-password or an
    admin-management route, not .env."""
    existing_super_admin = await db.users.find_one({"role": "super_admin", "deleted_at": None})
    if existing_super_admin is not None:
        return

    email = os.environ.get("SUPER_ADMIN_EMAIL")
    password = os.environ.get("SUPER_ADMIN_PASSWORD")
    if not email or not password:
        log.warning(
            "No super_admin exists and SUPER_ADMIN_EMAIL/SUPER_ADMIN_PASSWORD "
            "are not set -- skipping bootstrap. Set both in .env once to "
            "create the first super admin, then remove them."
        )
        return

    email = email.lower().strip()
    now = utcnow_iso()
    existing = await db.users.find_one({"email": email})
    if existing is not None:
        log.warning(
            "SUPER_ADMIN_EMAIL %s already exists as a non-super_admin user; "
            "not modifying it. Promote manually if intended.", email
        )
        return

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
    await db.politicians.create_index("verified")
    await db.politicians.create_index("party")
    await db.politicians.create_index("role")
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
    # voice/discussion + IP blocklist indexes
    await db.voice_comments.create_index("article_id")
    await db.voice_comments.create_index("anon_session_id")
    await db.voice_comments.create_index([("article_id", 1), ("created_at", -1)])
    await db.blocked_ips.create_index("ip", unique=True)
    #Backend Integration — SEO Metadata Route -  Guide @app/frontend/src/pages/dashboard/guides/BACKEND_INTEGRATION.md
    await db.seo_configs.create_index([("content_type", 1), ("content_id", 1)], unique=True)
    await db.seo_configs.create_index("content_type")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- startup ---
    db = get_db()
    await _create_indexes(db)
    await _seed_countries(db)
    await _seed_super_admin(db)
    upload_dir = os.environ.get("UPLOAD_DIR", "/app/backend/uploads")
    Path(upload_dir).mkdir(parents=True, exist_ok=True)
    init_image_router(db)
    yield
    # --- shutdown ---
    close_db()


app = FastAPI(title="TrackMP", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# =========================================================================
# SECURITY HEADERS MIDDLEWARE
# Note: several of these (X-Content-Type-Options, X-Frame-Options,
# Referrer-Policy, HSTS, CSP) are ALSO being set in nginx for the routes
# nginx serves directly (static build, uploads). This block covers
# responses that come straight from FastAPI without going through those
# nginx location blocks conceptually, and keeps things consistent even if
# nginx config ever changes. Setting the same header twice is harmless --
# the browser just uses the last one it receives, which will be nginx's
# since it's the outermost layer to the client.
# =========================================================================
#class SecurityHeadersMiddleware(BaseHTTPMiddleware):
#    async def dispatch(self, request, call_next):
#        response = await call_next(request)
#        response.headers["X-Content-Type-Options"] = "nosniff"
#        response.headers["X-Frame-Options"] = "DENY"
#        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
#        return response


#app.add_middleware(SecurityHeadersMiddleware)

# =========================================================================
# TRUSTED HOST
# ACTION NEEDED: replace with your real domain(s) before deploying.
# Requests with a mismatched Host header get a 400 before hitting any
# route. Include the bare domain and any subdomains you actually serve.
# =========================================================================
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=os.environ.get("ALLOWED_HOSTS", "your-domain.com,*.your-domain.com").split(","),
)

# =========================================================================
# GZIP
# nginx already gzips static assets and can gzip proxied API responses
# too if configured -- this covers JSON payloads returned directly by
# FastAPI, cheap insurance either way.
# =========================================================================
app.add_middleware(GZipMiddleware, minimum_size=1000)

# =========================================================================
# CORS
# ACTION NEEDED: set CORS_ORIGINS in .env to your real frontend origin(s),
# comma-separated, e.g. CORS_ORIGINS=https://your-domain.com
# Previously this fell back to "*" combined with allow_credentials=True,
# which is an invalid/unsafe combination -- browsers reject credentialed
# wildcard CORS, and depending on how strictly that's enforced it can
# expose authenticated endpoints to any origin. No more silent wildcard
# fallback: if CORS_ORIGINS isn't set, this defaults to empty (i.e. no
# cross-origin requests allowed) rather than allowing everything.
# =========================================================================
_cors_origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", "").split(",") if o.strip()]
if not _cors_origins:
    log.warning(
        "CORS_ORIGINS is not set in .env -- no cross-origin requests will "
        "be allowed. Set CORS_ORIGINS=https://your-domain.com to enable "
        "the frontend."
    )

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=_cors_origins,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.include_router(politician_filters_router)
app.include_router(api_router)
app.include_router(image_router, prefix="/api/images", tags=["images"])
app.include_router(voice_router)
app.include_router(admin_voice_router)
app.include_router(politician_verification_router)
app.include_router(promise_attachments_router)
app.include_router(admin_super_router)
app.include_router(seo_metadata_router)

_upload_dir = os.environ.get("UPLOAD_DIR", "/app/backend/uploads")
Path(_upload_dir).mkdir(parents=True, exist_ok=True)
# NOTE: nginx now intercepts /api/uploads/ directly (see updated nginx
# config) and serves files from disk without touching FastAPI at all.
# This mount stays as a fallback for local dev / anyone hitting uvicorn
# directly on :8001, but in production behind nginx it should see ~zero
# traffic. If you want to confirm, watch journalctl for GETs to
# /api/uploads after the nginx fix ships -- should go quiet.
app.mount("/api/uploads", StaticFiles(directory=_upload_dir), name="uploads")


@app.get("/api/health")
async def health():
    return {"status": "ok"}
