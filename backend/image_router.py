"""
Hardened image upload/optimization router — designed to be MOUNTED into your
existing TrackMP FastAPI app (server.py), reusing your existing Mongo
connection (db.py) and your existing cookie/JWT auth (security.py). No
domain/URL is hardcoded anywhere.

Key security properties:
  1. file_id / device_type / context are validated against strict allow-lists
     before ANY filesystem path is built from them -> closes path traversal.
  2. Upload/list/delete require a logged-in user via your existing
     get_current_user (same cookie-based JWT your other routes use) and
     delete additionally checks ownership.
  3. Rate limiter has a real in-memory fallback (fails CLOSED-ish, not open).
  4. Client id derived carefully; only trust X-Forwarded-For from a
     configured trusted proxy.
  5. Stored filenames never contain user-controlled data -> only file_id +
     a server-derived extension. Original name kept in metadata only.
  6. Image storage lives in a directory that is NOT mounted by your existing
     `app.mount("/api/uploads", StaticFiles(...))` -- otherwise originals
     and optimized files would be directly, publicly fetchable by filename,
     bypassing this router's auth, rate limiting, and device routing.
  7. Decompression-bomb warnings are promoted to errors.
  8. Metadata stored in your existing Mongo database (with owner_id +
     context) via db.py's get_db().

HOW TO WIRE INTO server.py:

    from db import get_db
    from image_router import router as image_router, init_image_router

    @app.on_event("startup")
    async def on_startup_images():
        init_image_router(get_db())

    app.include_router(image_router, prefix="/api/images", tags=["images"])

    # ^ add this include_router call alongside your existing
    #   app.include_router(api_router) line.
"""

import os
import io
import re
import uuid
import hashlib
import json
import asyncio
import logging
import time
import warnings
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from PIL import Image, ImageOps, UnidentifiedImageError
from PIL import Image as PILImage
from fastapi import (
    UploadFile, HTTPException, BackgroundTasks, Request, Depends,
    Query, APIRouter
)
from fastapi.responses import FileResponse, JSONResponse
import aiofiles
import magic
from cachetools import TTLCache

from security import get_current_user  # your existing cookie/JWT auth

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ==================== Configuration (env-driven where it matters) ====================

class ImageConfig:
    MAX_UPLOAD_SIZE_MB = 10
    MAX_IMAGE_PIXELS = 30_000_000  # 30MP
    MAX_IMAGE_DIMENSION = 8000

    ALLOWED_MIME_TYPES = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
    }

    ALLOWED_DEVICE_TYPES = {"mobile", "tablet", "desktop", "retina"}

    DEVICE_BREAKPOINTS = {
        "mobile": 480,
        "tablet": 768,
        "desktop": 1200,
        "retina": 1920,
    }

    QUALITY_SETTINGS = {
        "excellent": 92,
        "good": 85,
        "acceptable": 75,
        "minimum": 60,
    }

    CACHE_VERSION = 2
    CACHE_TTL_HOURS = 24
    MAX_CACHE_SIZE_BYTES = 100 * 1024 * 1024

    FILE_PERMISSIONS = 0o640          # not world-readable
    DIR_PERMISSIONS = 0o750

    ORIGINAL_RETENTION_DAYS = 7
    OPTIMIZED_RETENTION_DAYS = 30

    # Trust X-Forwarded-For only if request came from this proxy (set in env).
    # CORS / TrustedHost / domain config is NOT handled here on purpose --
    # your existing app already owns that middleware, so nothing about a
    # domain or URL is duplicated or hardcoded in this file.
    TRUSTED_PROXY_IP = os.getenv("TRUSTED_PROXY_IP", "")

    # Allowed upload contexts -- extend this list as you add more forms/pages.
    ALLOWED_CONTEXTS = set(
        c.strip() for c in os.getenv(
            "IMAGE_UPLOAD_CONTEXTS",
            "profile_photo,product_image,blog_cover,listing_photo,generic"
        ).split(",") if c.strip()
    )

# Strict allow-list pattern for anything that touches a filesystem path.
FILE_ID_RE = re.compile(r"^[0-9a-f]{32}$")  # uuid.uuid4().hex format

# Promote decompression-bomb *warnings* to hard errors (not just the >2x case)
warnings.simplefilter("error", Image.DecompressionBombWarning)


def require_valid_file_id(file_id: str) -> str:
    """Validate file_id before it is ever used in a path. Raises 400 otherwise."""
    if not FILE_ID_RE.match(file_id):
        raise HTTPException(400, "Invalid file id")
    return file_id


def require_valid_device_type(device_type: str) -> str:
    if device_type not in ImageConfig.ALLOWED_DEVICE_TYPES:
        raise HTTPException(400, "Invalid device type")
    return device_type


def require_valid_context(context: str) -> str:
    if context not in ImageConfig.ALLOWED_CONTEXTS:
        raise HTTPException(400, f"Invalid upload context. Allowed: {sorted(ImageConfig.ALLOWED_CONTEXTS)}")
    return context


# ==================== Auth ====================

async def get_owner_id(user: dict = Depends(get_current_user)) -> str:
    """Reuses your existing cookie/JWT auth (security.get_current_user).
    Any logged-in user (user/admin/super_admin) can upload; ownership of
    each image is tied to their Mongo _id for the delete-ownership check.
    Raises 401 automatically via get_current_user if not logged in."""
    return user["_id"]


# ==================== Security Utilities ====================

class SecurityUtils:
    @staticmethod
    def sanitize_display_filename(filename: str) -> str:
        """Sanitize a filename that will be stored ONLY as metadata (never
        used to build a filesystem path)."""
        safe_name = Path(filename).name
        safe_name = safe_name.replace("/", "").replace("\\", "").replace("..", "")
        safe_name = "".join(c for c in safe_name if c.isalnum() or c in "._- ")
        if len(safe_name) > 200:
            name, ext = os.path.splitext(safe_name)
            safe_name = name[:180] + ext
        return safe_name or "untitled"

    @staticmethod
    def generate_safe_id() -> str:
        return uuid.uuid4().hex

    @staticmethod
    def validate_mime_type(content: bytes) -> str:
        try:
            mime = magic.from_buffer(content[:2048], mime=True)
        except Exception as e:
            logger.error(f"MIME validation failed: {e}")
            raise HTTPException(400, "Invalid file format")
        if mime not in ImageConfig.ALLOWED_MIME_TYPES:
            raise HTTPException(400, "Unsupported file type")
        return mime


# ==================== Cache Manager ====================

class CacheManager:
    def __init__(self, redis_url: Optional[str] = None):
        self.redis = None
        self.memory_cache = TTLCache(maxsize=1000, ttl=ImageConfig.CACHE_TTL_HOURS * 3600)
        self.max_cache_bytes = ImageConfig.MAX_CACHE_SIZE_BYTES

        if redis_url:
            try:
                import redis.asyncio as redis
                self.redis = redis.from_url(redis_url, decode_responses=False)
            except Exception as e:
                logger.warning(f"Redis connection failed: {e}")

    def _key(self, image_hash: str, device: str, width: int) -> str:
        return f"v{ImageConfig.CACHE_VERSION}:img:{image_hash}:{device}:{width}"

    async def get(self, image_hash: str, device: str, width: int) -> Optional[bytes]:
        key = self._key(image_hash, device, width)
        if key in self.memory_cache:
            return self.memory_cache[key]
        if self.redis:
            try:
                data = await self.redis.get(key)
                if data:
                    if len(data) <= self.max_cache_bytes // 10:
                        self.memory_cache[key] = data
                    return data
            except Exception as e:
                logger.error(f"Redis get failed: {e}")
        return None

    async def set(self, image_hash: str, device: str, width: int, data: bytes):
        key = self._key(image_hash, device, width)
        if len(data) <= self.max_cache_bytes // 10:
            self.memory_cache[key] = data
        if self.redis:
            try:
                await self.redis.setex(key, ImageConfig.CACHE_TTL_HOURS * 3600, data)
            except Exception as e:
                logger.error(f"Redis set failed: {e}")

    async def invalidate(self, image_hash: str):
        prefix = f"v{ImageConfig.CACHE_VERSION}:img:{image_hash}"
        for key in list(self.memory_cache.keys()):
            if key.startswith(prefix):
                del self.memory_cache[key]
        if self.redis:
            try:
                pattern = f"{prefix}:*"
                keys = await self.redis.keys(pattern)
                if keys:
                    await self.redis.delete(*keys)
            except Exception as e:
                logger.error(f"Redis invalidation failed: {e}")


# ==================== Rate Limiter (real fallback, not fail-open) ====================

class RateLimiter:
    """Sliding-window rate limiter. Uses Redis if available, otherwise an
    in-process TTL-based counter so a Redis-less deployment is still
    protected (fixes the original 'always allow' bug)."""

    def __init__(self, redis_url: Optional[str] = None):
        self.redis = None
        if redis_url:
            try:
                import redis.asyncio as redis
                self.redis = redis.from_url(redis_url, decode_responses=True)
            except Exception:
                pass
        # fallback: client_id -> list[timestamps]
        self._local_hits: Dict[str, list] = {}

    async def check_rate_limit(self, client_id: str, limit: int = 60, window: int = 3600) -> bool:
        if self.redis:
            key = f"rate_limit:{client_id}"
            current = int(time.time())
            try:
                await self.redis.zremrangebyscore(key, 0, current - window)
                count = await self.redis.zcard(key)
                if count >= limit:
                    return False
                await self.redis.zadd(key, {str(current): current})
                await self.redis.expire(key, window)
                return True
            except Exception as e:
                logger.error(f"Redis rate limit check failed, falling back to local: {e}")

        # In-memory fallback
        now = time.time()
        hits = self._local_hits.setdefault(client_id, [])
        hits[:] = [t for t in hits if now - t < window]
        if len(hits) >= limit:
            return False
        hits.append(now)
        return True


def get_client_id(request: Request) -> str:
    """Derive a client id, only trusting X-Forwarded-For if the direct
    connection is from our configured trusted proxy (e.g. local Nginx)."""
    direct_ip = request.client.host if request.client else "unknown"
    if ImageConfig.TRUSTED_PROXY_IP and direct_ip == ImageConfig.TRUSTED_PROXY_IP:
        fwd = request.headers.get("x-forwarded-for")
        if fwd:
            return fwd.split(",")[0].strip()
    return direct_ip


# ==================== Image Processor ====================

class ImageProcessor:
    def __init__(self, upload_dir: str = "uploads", redis_url: Optional[str] = None):
        self.upload_dir = Path(upload_dir)
        self.original_dir = self.upload_dir / "originals"
        self.optimized_dir = self.upload_dir / "optimized"

        for d in (self.original_dir, self.optimized_dir):
            d.mkdir(mode=ImageConfig.DIR_PERMISSIONS, parents=True, exist_ok=True)

        self.cache = CacheManager(redis_url)
        self.rate_limiter = RateLimiter(redis_url)
        PILImage.MAX_IMAGE_PIXELS = ImageConfig.MAX_IMAGE_PIXELS

    async def process_image(
        self,
        file: UploadFile,
        background_tasks: BackgroundTasks,
        client_id: str,
        owner_id: str,
        context: str,
        device_type: str,
        width_hint: Optional[int],
        quality_override: Optional[int],
    ) -> Dict[str, Any]:
        if not await self.rate_limiter.check_rate_limit(client_id):
            raise HTTPException(429, "Too many requests. Please try again later.")

        require_valid_device_type(device_type)
        require_valid_context(context)

        content = await self._read_file_safely(file)
        mime_type = SecurityUtils.validate_mime_type(content)
        display_name = SecurityUtils.sanitize_display_filename(file.filename or "image")
        file_id = SecurityUtils.generate_safe_id()
        ext = ImageConfig.ALLOWED_MIME_TYPES[mime_type]

        # IMPORTANT: path built ONLY from server-generated file_id + verified
        # extension -- never from user-controlled filename.
        original_path = self.original_dir / f"{file_id}{ext}"
        async with aiofiles.open(original_path, "wb") as f:
            await f.write(content)
        os.chmod(original_path, ImageConfig.FILE_PERMISSIONS)

        background_tasks.add_task(
            self._process_and_cache_image,
            content=content,
            file_id=file_id,
            owner_id=owner_id,
            context=context,
            display_name=display_name,
            mime_type=mime_type,
            device_type=device_type,
            width_hint=width_hint,
            quality_override=quality_override,
        )

        return {
            "file_id": file_id,
            "original_filename": display_name,
            "original_size": len(content),
            "mime_type": mime_type,
            "context": context,
            "status": "processing",
            "url": f"/images/{file_id}",
        }

    async def _read_file_safely(self, file: UploadFile) -> bytes:
        """Stream the upload using the real UploadFile API and enforce the
        size cap while reading (not after)."""
        max_bytes = ImageConfig.MAX_UPLOAD_SIZE_MB * 1024 * 1024
        chunk_size = 1024 * 1024
        chunks = []
        total = 0
        try:
            while True:
                chunk = await file.read(chunk_size)
                if not chunk:
                    break
                total += len(chunk)
                if total > max_bytes:
                    raise HTTPException(413, f"File exceeds maximum size of {ImageConfig.MAX_UPLOAD_SIZE_MB}MB")
                chunks.append(chunk)
        finally:
            await file.close()
        if total == 0:
            raise HTTPException(400, "Empty file")
        return b"".join(chunks)

    async def _process_and_cache_image(
        self,
        content: bytes,
        file_id: str,
        owner_id: str,
        context: str,
        display_name: str,
        mime_type: str,
        device_type: str,
        width_hint: Optional[int],
        quality_override: Optional[int],
    ):
        try:
            result = await asyncio.to_thread(
                self._process_image_sync,
                content=content,
                device_type=device_type,
                width_hint=width_hint,
                quality_override=quality_override,
            )

            cache_key = hashlib.sha256(content).hexdigest()
            await self.cache.set(cache_key, device_type, result["width"], result["data"])

            optimized_path = self.optimized_dir / f"{file_id}_{device_type}.webp"
            async with aiofiles.open(optimized_path, "wb") as f:
                await f.write(result["data"])
            os.chmod(optimized_path, ImageConfig.FILE_PERMISSIONS)

            await self._save_metadata(file_id, owner_id, context, display_name, result)
            logger.info(f"Image processed: {file_id} ({device_type})")

        except Exception as e:
            # Don't let a stack trace with content details hit the logs.
            logger.error(f"Image processing failed for {file_id}: {type(e).__name__}")

    def _process_image_sync(
        self,
        content: bytes,
        device_type: str,
        width_hint: Optional[int],
        quality_override: Optional[int],
    ) -> Dict[str, Any]:
        try:
            image = Image.open(io.BytesIO(content))
            image.load()  # force full decode now so bomb warnings/errors fire here
        except UnidentifiedImageError:
            raise ValueError("Invalid image format")
        except Image.DecompressionBombWarning:
            raise ValueError("Image too large (decompression bomb detected)")
        except Exception as e:
            raise ValueError(f"Failed to open image: {type(e).__name__}")

        image = ImageOps.exif_transpose(image)
        # NOTE: no separate "strip_exif" step needed -- we never pass exif=
        # to .save() below, so the re-encoded WEBP carries no EXIF.

        if image.width > ImageConfig.MAX_IMAGE_DIMENSION or image.height > ImageConfig.MAX_IMAGE_DIMENSION:
            raise ValueError(f"Image dimensions exceed maximum of {ImageConfig.MAX_IMAGE_DIMENSION}px")

        original_mode = image.mode
        if original_mode in ("RGBA", "LA", "PA"):
            image = image.convert("RGBA")
            has_transparency = True
        elif original_mode == "P":
            has_transparency = "transparency" in image.info
            image = image.convert("RGBA" if has_transparency else "RGB")
        else:
            image = image.convert("RGB")
            has_transparency = False

        target_width = self._determine_target_width(device_type, width_hint)
        original_width, original_height = image.size
        if original_width > target_width:
            ratio = target_width / original_width
            new_size = (target_width, max(1, int(original_height * ratio)))
            image = image.resize(new_size, Image.Resampling.LANCZOS)

        quality = self._determine_quality(quality_override, image, has_transparency)

        output_buffer = io.BytesIO()
        save_kwargs = {"format": "WEBP", "quality": quality, "optimize": True, "method": 6}
        if has_transparency:
            save_kwargs["lossless"] = False

        try:
            image.save(output_buffer, **save_kwargs)
        except Exception as e:
            raise ValueError(f"Failed to save image: {type(e).__name__}")

        optimized_data = output_buffer.getvalue()
        return {
            "data": optimized_data,
            "width": image.width,
            "height": image.height,
            "quality": quality,
            "has_transparency": has_transparency,
            "original_width": original_width,
            "original_height": original_height,
            "size": len(optimized_data),
            "compression_ratio": len(optimized_data) / len(content),
        }

    def _determine_target_width(self, device_type: str, width_hint: Optional[int]) -> int:
        base_width = ImageConfig.DEVICE_BREAKPOINTS[device_type]
        if width_hint:
            for width in sorted(ImageConfig.DEVICE_BREAKPOINTS.values()):
                if width >= width_hint:
                    return width
            return max(ImageConfig.DEVICE_BREAKPOINTS.values())
        return base_width

    def _determine_quality(self, quality_override: Optional[int], image, has_transparency: bool) -> int:
        if quality_override is not None:
            return max(1, min(100, quality_override))
        score = self._score_image_quality(image)
        if score >= 85:
            quality = ImageConfig.QUALITY_SETTINGS["excellent"]
        elif score >= 70:
            quality = ImageConfig.QUALITY_SETTINGS["good"]
        elif score >= 50:
            quality = ImageConfig.QUALITY_SETTINGS["acceptable"]
        else:
            quality = ImageConfig.QUALITY_SETTINGS["minimum"]
        if has_transparency:
            quality = min(quality + 10, 100)
        return quality

    def _score_image_quality(self, image) -> float:
        try:
            total_pixels = image.width * image.height
            megapixels = total_pixels / 1_000_000
            if megapixels > 20:
                density_score = 100
            elif megapixels > 10:
                density_score = 85
            elif megapixels > 5:
                density_score = 70
            else:
                density_score = 50

            img = image.convert("RGB") if image.mode != "RGB" else image
            small = img.resize((50, 50))
            colors = set(small.getdata())
            color_score = min(100, (len(colors) / 2500) * 150)
            return density_score * 0.6 + color_score * 0.4
        except Exception:
            return 70

    async def _save_metadata(self, file_id: str, owner_id: str, context: str, display_name: str, result: Dict[str, Any]):
        """Metadata now goes to MongoDB (with owner_id + context) instead
        of a loose JSON file. See MongoMetadataStore below."""
        await mongo_store.save(file_id, owner_id, context, display_name, result)

    async def get_optimized_image(self, file_id: str, device_type: str):
        require_valid_file_id(file_id)
        require_valid_device_type(device_type)

        optimized_path = self.optimized_dir / f"{file_id}_{device_type}.webp"
        if optimized_path.exists():
            return FileResponse(
                optimized_path,
                media_type="image/webp",
                headers={
                    "X-Content-Type-Options": "nosniff",
                    "Content-Security-Policy": "default-src 'none'",
                    "Cache-Control": f"public, max-age={ImageConfig.CACHE_TTL_HOURS * 3600}",
                    "ETag": f'"{file_id}-{device_type}"',
                },
            )

        fallback_path = self.optimized_dir / f"{file_id}_desktop.webp"
        if fallback_path.exists():
            return FileResponse(fallback_path, media_type="image/webp")

        # Only glob within a validated file_id -- safe now.
        originals = list(self.original_dir.glob(f"{file_id}.*"))
        if originals:
            return FileResponse(originals[0])

        raise HTTPException(404, "Image not found")

    def detect_device(self, request: Request) -> str:
        sec_ch_ua_mobile = request.headers.get("sec-ch-ua-mobile", "?0")
        if sec_ch_ua_mobile == "?1":
            return "mobile"

        width_hint = request.headers.get("viewport-width")
        if width_hint:
            try:
                width = int(width_hint)
            except ValueError:
                width = None
            if width is not None:
                if width <= 480:
                    return "mobile"
                elif width <= 768:
                    return "tablet"
                elif width <= 1200:
                    return "desktop"
                return "retina"

        user_agent = request.headers.get("user-agent", "").lower()
        if any(d in user_agent for d in ("mobile", "android", "iphone", "ipod")):
            return "mobile"
        elif any(d in user_agent for d in ("ipad", "tablet")):
            return "tablet"
        return "desktop"

    async def delete_image(self, file_id: str, requester_id: str):
        require_valid_file_id(file_id)
        meta = await mongo_store.get(file_id)
        if not meta:
            raise HTTPException(404, "Image not found")
        if meta.get("owner_id") != requester_id:
            raise HTTPException(403, "Not authorized to delete this image")

        deleted = 0
        for path in self.original_dir.glob(f"{file_id}.*"):
            path.unlink(missing_ok=True)
            deleted += 1
        for path in self.optimized_dir.glob(f"{file_id}_*"):
            path.unlink(missing_ok=True)
            deleted += 1

        await self.cache.invalidate(file_id)
        await mongo_store.delete(file_id)
        return deleted

    async def cleanup_old_files(self):
        now = datetime.utcnow()
        original_cutoff = now - timedelta(days=ImageConfig.ORIGINAL_RETENTION_DAYS)
        for file_path in self.original_dir.iterdir():
            if file_path.is_file():
                mtime = datetime.fromtimestamp(file_path.stat().st_mtime)
                if mtime < original_cutoff:
                    try:
                        file_path.unlink()
                    except Exception as e:
                        logger.error(f"Failed to delete {file_path.name}: {e}")

        optimized_cutoff = now - timedelta(days=ImageConfig.OPTIMIZED_RETENTION_DAYS)
        for file_path in self.optimized_dir.iterdir():
            if file_path.is_file():
                mtime = datetime.fromtimestamp(file_path.stat().st_mtime)
                if mtime < optimized_cutoff:
                    try:
                        file_path.unlink()
                    except Exception as e:
                        logger.error(f"Failed to delete {file_path.name}: {e}")


# ==================== MongoDB metadata store ====================
# Requires: pip install motor
#
# This does NOT open its own Mongo connection by default. Call
# init_image_router(mongo_client=...) from your app's startup event, passing
# the AsyncIOMotorClient you already use elsewhere, so there's exactly one
# connection pool for the whole app.

class MongoMetadataStore:
    def __init__(self):
        self._collection = None

    def bind(self, db, collection_name: str = "image_uploads"):
        """`db` is the Motor database object returned by your existing
        db.get_db() -- not a client, and no db_name needed since get_db()
        already picked the database via DB_NAME."""
        self._collection = db[collection_name]

    async def save(self, file_id: str, owner_id: str, context: str, display_name: str, result: Dict[str, Any]):
        if self._collection is None:
            logger.warning("Mongo not bound -- image metadata was NOT saved.")
            return
        doc = {
            "_id": file_id,
            "owner_id": owner_id,
            "context": context,
            "display_name": display_name,
            "timestamp": datetime.utcnow(),
            "width": result["width"],
            "height": result["height"],
            "quality": result["quality"],
            "size": result["size"],
            "compression_ratio": result["compression_ratio"],
            "has_transparency": result["has_transparency"],
            "original_width": result["original_width"],
            "original_height": result["original_height"],
        }
        await self._collection.replace_one({"_id": file_id}, doc, upsert=True)

    async def get(self, file_id: str) -> Optional[Dict[str, Any]]:
        if self._collection is None:
            return None
        return await self._collection.find_one({"_id": file_id})

    async def list_by_owner(self, owner_id: str, context: Optional[str] = None) -> list:
        if self._collection is None:
            return []
        query = {"owner_id": owner_id}
        if context:
            query["context"] = context
        return [doc async for doc in self._collection.find(query).sort("timestamp", -1)]

    async def delete(self, file_id: str):
        if self._collection is not None:
            await self._collection.delete_one({"_id": file_id})


mongo_store = MongoMetadataStore()

# IMPORTANT: this must NOT be a subdirectory of UPLOAD_DIR, because
# server.py does `app.mount("/api/uploads", StaticFiles(directory=UPLOAD_DIR))`
# which serves everything under it publicly, by filename, with no auth --
# that would let anyone fetch un-optimized originals directly and bypass
# this router's rate limiting/auth entirely. Default is a SIBLING directory.
_base_upload_dir = os.getenv("UPLOAD_DIR", "/opt/trackmp/backend/uploads")
_default_images_dir = os.path.normpath(_base_upload_dir) + "_images"  # sibling, not nested
_images_dir = os.getenv("IMAGE_UPLOAD_DIR", _default_images_dir)
processor = ImageProcessor(upload_dir=_images_dir, redis_url=os.getenv("REDIS_URL"))


def init_image_router(db, collection_name: str = "image_uploads"):
    """Call this once from server.py's startup event, e.g.:

        from db import get_db
        from image_router import init_image_router

        @app.on_event("startup")
        async def on_startup_images():
            init_image_router(get_db())
    """
    mongo_store.bind(db, collection_name)
    asyncio.create_task(_background_cleanup())


async def _background_cleanup():
    while True:
        try:
            await asyncio.sleep(24 * 3600)
            await processor.cleanup_old_files()
        except Exception as e:
            logger.error(f"Cleanup failed: {e}")


# ==================== Router ====================
# Mount this in your existing app, e.g.:
#   app.include_router(router, prefix="/api/images", tags=["images"])
# No domain, host, or URL is referenced anywhere below.

router = APIRouter()


@router.post("/upload")
async def upload_image(
    request: Request,
    file: UploadFile,
    background_tasks: BackgroundTasks,
    context: str = Query(default="generic", description="Which page/form this upload is for"),
    device_type: str = Query(default="auto"),
    width_hint: Optional[int] = Query(default=None, ge=1, le=10000),
    quality: Optional[int] = Query(default=None, ge=1, le=100),
    owner_id: str = Depends(get_owner_id),
):
    client_id = get_client_id(request)

    if device_type == "auto":
        device_type = processor.detect_device(request)
    else:
        require_valid_device_type(device_type)

    result = await processor.process_image(
        file=file,
        background_tasks=background_tasks,
        client_id=client_id,
        owner_id=owner_id,
        context=context,
        device_type=device_type,
        width_hint=width_hint,
        quality_override=quality,
    )
    return JSONResponse(result)


@router.get("/{file_id}")
async def get_image(file_id: str, request: Request):
    file_id = require_valid_file_id(file_id)
    device_type = processor.detect_device(request)
    return await processor.get_optimized_image(file_id, device_type)


@router.get("/{file_id}/metadata")
async def get_metadata(file_id: str):
    file_id = require_valid_file_id(file_id)
    meta = await mongo_store.get(file_id)
    if not meta:
        raise HTTPException(404, "Image metadata not found")
    meta["file_id"] = meta.pop("_id")
    return JSONResponse(meta, default=str)


@router.get("")
async def list_my_images(context: Optional[str] = None, owner_id: str = Depends(get_owner_id)):
    if context:
        require_valid_context(context)
    docs = await mongo_store.list_by_owner(owner_id, context)
    for d in docs:
        d["file_id"] = d.pop("_id")
    return JSONResponse(docs, default=str)


@router.delete("/{file_id}")
async def delete_image(file_id: str, owner_id: str = Depends(get_owner_id)):
    file_id = require_valid_file_id(file_id)
    deleted = await processor.delete_image(file_id, requester_id=owner_id)
    return {"deleted": deleted, "file_id": file_id}
