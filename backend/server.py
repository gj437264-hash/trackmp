from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Annotated

import bcrypt
import jwt
from bson import ObjectId
from fastapi import FastAPI, APIRouter, Depends, HTTPException, Request, Response, Query
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict, BeforeValidator

# ----- DB -----
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# ----- App -----
app = FastAPI(title="TrackMP API")
api_router = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_MINUTES = 60 * 24 * 7  # 7 days for simplicity (MVP)

# ----- Helpers -----
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_MINUTES),
        "type": "access",
    }
    return jwt.encode(payload, os.environ["JWT_SECRET"], algorithm=JWT_ALGORITHM)

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def new_id() -> str:
    return str(uuid.uuid4())

# ----- Models -----
class UserPublic(BaseModel):
    id: str
    email: EmailStr
    name: str
    role: str = "user"
    created_at: str

class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1, max_length=80)

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class PoliticianIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    party: str = Field(min_length=1, max_length=80)
    constituency: str = Field(min_length=1, max_length=120)
    state: str = Field(min_length=1, max_length=80)
    position: str = Field(min_length=1, max_length=120)
    photo_url: Optional[str] = None
    bio: Optional[str] = ""

class PoliticianOut(PoliticianIn):
    id: str
    created_by: str
    created_by_name: str
    created_at: str
    verified: bool = False
    promises_count: int = 0
    delivered_count: int = 0
    broken_count: int = 0
    rating_avg: float = 0.0
    rating_count: int = 0

class PromiseIn(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str = Field(max_length=2000, default="")
    status: str = Field(default="pending")  # pending | in_progress | delivered | broken
    date_made: Optional[str] = None
    source_url: Optional[str] = None
    category: Optional[str] = "general"

class PromiseOut(PromiseIn):
    id: str
    politician_id: str
    created_by: str
    created_by_name: str
    created_at: str
    upvotes: int = 0
    downvotes: int = 0
    my_vote: int = 0

class WorkIn(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str = Field(max_length=2000, default="")
    date: Optional[str] = None
    source_url: Optional[str] = None

class WorkOut(WorkIn):
    id: str
    politician_id: str
    created_by: str
    created_by_name: str
    created_at: str

class CommentIn(BaseModel):
    body: str = Field(min_length=1, max_length=1000)

class CommentOut(BaseModel):
    id: str
    politician_id: str
    body: str
    created_by: str
    created_by_name: str
    created_at: str

class RatingIn(BaseModel):
    score: int = Field(ge=1, le=5)

class VoteIn(BaseModel):
    value: int = Field(ge=-1, le=1)  # 1 upvote, -1 downvote, 0 clear

VALID_STATUSES = {"pending", "in_progress", "delivered", "broken"}

# ----- Auth dep -----
async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"id": payload["sub"]})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user.pop("_id", None)
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_optional_user(request: Request) -> Optional[dict]:
    try:
        return await get_current_user(request)
    except HTTPException:
        return None

def set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=ACCESS_TOKEN_MINUTES * 60,
        path="/",
    )

# ----- Auth endpoints -----
@api_router.post("/auth/register")
async def register(payload: RegisterIn, response: Response):
    email = payload.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = new_id()
    doc = {
        "id": user_id,
        "email": email,
        "name": payload.name.strip(),
        "password_hash": hash_password(payload.password),
        "role": "user",
        "created_at": now_iso(),
    }
    await db.users.insert_one(doc)
    token = create_access_token(user_id, email)
    set_auth_cookie(response, token)
    return {"id": user_id, "email": email, "name": payload.name.strip(), "role": "user", "created_at": doc["created_at"], "token": token}

@api_router.post("/auth/login")
async def login(payload: LoginIn, response: Response):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(user["id"], email)
    set_auth_cookie(response, token)
    return {"id": user["id"], "email": user["email"], "name": user["name"], "role": user.get("role", "user"), "created_at": user["created_at"], "token": token}

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}

@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user

# ----- Politicians -----
async def _enrich_politician(pol: dict) -> dict:
    pol.pop("_id", None)
    promises = await db.promises.find({"politician_id": pol["id"]}).to_list(2000)
    pol["promises_count"] = len(promises)
    pol["delivered_count"] = sum(1 for p in promises if p.get("status") == "delivered")
    pol["broken_count"] = sum(1 for p in promises if p.get("status") == "broken")
    ratings = await db.ratings.find({"politician_id": pol["id"]}).to_list(5000)
    if ratings:
        pol["rating_avg"] = round(sum(r["score"] for r in ratings) / len(ratings), 2)
        pol["rating_count"] = len(ratings)
    else:
        pol["rating_avg"] = 0.0
        pol["rating_count"] = 0
    return pol

@api_router.get("/politicians")
async def list_politicians(
    q: Optional[str] = None,
    party: Optional[str] = None,
    state: Optional[str] = None,
    constituency: Optional[str] = None,
    sort: str = "recent",  # recent | promises | delivered | rating
):
    query = {}
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"constituency": {"$regex": q, "$options": "i"}},
            {"party": {"$regex": q, "$options": "i"}},
        ]
    if party:
        query["party"] = party
    if state:
        query["state"] = state
    if constituency:
        query["constituency"] = {"$regex": constituency, "$options": "i"}

    docs = await db.politicians.find(query).to_list(500)
    out = [await _enrich_politician(d) for d in docs]
    if sort == "promises":
        out.sort(key=lambda x: x["promises_count"], reverse=True)
    elif sort == "delivered":
        out.sort(key=lambda x: x["delivered_count"], reverse=True)
    elif sort == "rating":
        out.sort(key=lambda x: x["rating_avg"], reverse=True)
    else:
        out.sort(key=lambda x: x["created_at"], reverse=True)
    return out

@api_router.post("/politicians")
async def create_politician(payload: PoliticianIn, user: dict = Depends(get_current_user)):
    pol_id = new_id()
    doc = {
        "id": pol_id,
        **payload.model_dump(),
        "created_by": user["id"],
        "created_by_name": user["name"],
        "created_at": now_iso(),
        "verified": False,
    }
    await db.politicians.insert_one(doc)
    return await _enrich_politician(doc)

@api_router.get("/politicians/{pid}")
async def get_politician(pid: str):
    pol = await db.politicians.find_one({"id": pid})
    if not pol:
        raise HTTPException(status_code=404, detail="Politician not found")
    return await _enrich_politician(pol)

@api_router.put("/politicians/{pid}")
async def update_politician(pid: str, payload: PoliticianIn, user: dict = Depends(get_current_user)):
    pol = await db.politicians.find_one({"id": pid})
    if not pol:
        raise HTTPException(status_code=404, detail="Politician not found")
    await db.politicians.update_one({"id": pid}, {"$set": payload.model_dump()})
    pol = await db.politicians.find_one({"id": pid})
    return await _enrich_politician(pol)

@api_router.delete("/politicians/{pid}")
async def delete_politician(pid: str, user: dict = Depends(get_current_user)):
    pol = await db.politicians.find_one({"id": pid})
    if not pol:
        raise HTTPException(status_code=404, detail="Politician not found")
    if pol.get("created_by") != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only creator or admin can delete")
    await db.politicians.delete_one({"id": pid})
    await db.promises.delete_many({"politician_id": pid})
    await db.works.delete_many({"politician_id": pid})
    await db.comments.delete_many({"politician_id": pid})
    await db.ratings.delete_many({"politician_id": pid})
    return {"ok": True}

# ----- Promises -----
async def _enrich_promise(p: dict, user_id: Optional[str]) -> dict:
    p.pop("_id", None)
    p["upvotes"] = await db.votes.count_documents({"promise_id": p["id"], "value": 1})
    p["downvotes"] = await db.votes.count_documents({"promise_id": p["id"], "value": -1})
    p["my_vote"] = 0
    if user_id:
        v = await db.votes.find_one({"promise_id": p["id"], "user_id": user_id})
        if v:
            p["my_vote"] = v["value"]
    return p

@api_router.get("/politicians/{pid}/promises")
async def list_promises(pid: str, user: Optional[dict] = Depends(get_optional_user)):
    docs = await db.promises.find({"politician_id": pid}).sort("created_at", -1).to_list(1000)
    uid = user["id"] if user else None
    return [await _enrich_promise(d, uid) for d in docs]

@api_router.post("/politicians/{pid}/promises")
async def create_promise(pid: str, payload: PromiseIn, user: dict = Depends(get_current_user)):
    if payload.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid status")
    if not await db.politicians.find_one({"id": pid}):
        raise HTTPException(status_code=404, detail="Politician not found")
    doc = {
        "id": new_id(),
        "politician_id": pid,
        **payload.model_dump(),
        "created_by": user["id"],
        "created_by_name": user["name"],
        "created_at": now_iso(),
    }
    await db.promises.insert_one(doc)
    return await _enrich_promise(doc, user["id"])

@api_router.patch("/promises/{prom_id}/status")
async def update_promise_status(prom_id: str, payload: dict, user: dict = Depends(get_current_user)):
    status = payload.get("status")
    if status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid status")
    promise = await db.promises.find_one({"id": prom_id})
    if not promise:
        raise HTTPException(status_code=404, detail="Promise not found")
    await db.promises.update_one({"id": prom_id}, {"$set": {"status": status}})
    promise["status"] = status
    return await _enrich_promise(promise, user["id"])

@api_router.delete("/promises/{prom_id}")
async def delete_promise(prom_id: str, user: dict = Depends(get_current_user)):
    promise = await db.promises.find_one({"id": prom_id})
    if not promise:
        raise HTTPException(status_code=404, detail="Promise not found")
    if promise.get("created_by") != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only creator or admin can delete")
    await db.promises.delete_one({"id": prom_id})
    await db.votes.delete_many({"promise_id": prom_id})
    return {"ok": True}

@api_router.post("/promises/{prom_id}/vote")
async def vote_promise(prom_id: str, payload: VoteIn, user: dict = Depends(get_current_user)):
    if not await db.promises.find_one({"id": prom_id}):
        raise HTTPException(status_code=404, detail="Promise not found")
    if payload.value == 0:
        await db.votes.delete_one({"promise_id": prom_id, "user_id": user["id"]})
    else:
        await db.votes.update_one(
            {"promise_id": prom_id, "user_id": user["id"]},
            {"$set": {"value": payload.value, "promise_id": prom_id, "user_id": user["id"], "updated_at": now_iso()}},
            upsert=True,
        )
    promise = await db.promises.find_one({"id": prom_id})
    return await _enrich_promise(promise, user["id"])

# ----- Work / Achievements -----
@api_router.get("/politicians/{pid}/works")
async def list_works(pid: str):
    docs = await db.works.find({"politician_id": pid}).sort("created_at", -1).to_list(1000)
    for d in docs:
        d.pop("_id", None)
    return docs

@api_router.post("/politicians/{pid}/works")
async def create_work(pid: str, payload: WorkIn, user: dict = Depends(get_current_user)):
    if not await db.politicians.find_one({"id": pid}):
        raise HTTPException(status_code=404, detail="Politician not found")
    doc = {
        "id": new_id(),
        "politician_id": pid,
        **payload.model_dump(),
        "created_by": user["id"],
        "created_by_name": user["name"],
        "created_at": now_iso(),
    }
    await db.works.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.delete("/works/{work_id}")
async def delete_work(work_id: str, user: dict = Depends(get_current_user)):
    work = await db.works.find_one({"id": work_id})
    if not work:
        raise HTTPException(status_code=404, detail="Work not found")
    if work.get("created_by") != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only creator or admin can delete")
    await db.works.delete_one({"id": work_id})
    return {"ok": True}

# ----- Comments -----
@api_router.get("/politicians/{pid}/comments")
async def list_comments(pid: str):
    docs = await db.comments.find({"politician_id": pid}).sort("created_at", -1).to_list(1000)
    for d in docs:
        d.pop("_id", None)
    return docs

@api_router.post("/politicians/{pid}/comments")
async def create_comment(pid: str, payload: CommentIn, user: dict = Depends(get_current_user)):
    if not await db.politicians.find_one({"id": pid}):
        raise HTTPException(status_code=404, detail="Politician not found")
    doc = {
        "id": new_id(),
        "politician_id": pid,
        "body": payload.body,
        "created_by": user["id"],
        "created_by_name": user["name"],
        "created_at": now_iso(),
    }
    await db.comments.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.delete("/comments/{cid}")
async def delete_comment(cid: str, user: dict = Depends(get_current_user)):
    c = await db.comments.find_one({"id": cid})
    if not c:
        raise HTTPException(status_code=404, detail="Comment not found")
    if c.get("created_by") != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only creator or admin can delete")
    await db.comments.delete_one({"id": cid})
    return {"ok": True}

# ----- Ratings -----
@api_router.post("/politicians/{pid}/rate")
async def rate_politician(pid: str, payload: RatingIn, user: dict = Depends(get_current_user)):
    if not await db.politicians.find_one({"id": pid}):
        raise HTTPException(status_code=404, detail="Politician not found")
    await db.ratings.update_one(
        {"politician_id": pid, "user_id": user["id"]},
        {"$set": {"politician_id": pid, "user_id": user["id"], "score": payload.score, "updated_at": now_iso()}},
        upsert=True,
    )
    pol = await db.politicians.find_one({"id": pid})
    return await _enrich_politician(pol)

# ----- Stats -----
@api_router.patch("/politicians/{pid}/verify")
async def verify_politician(pid: str, payload: dict, user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    pol = await db.politicians.find_one({"id": pid})
    if not pol:
        raise HTTPException(status_code=404, detail="Politician not found")
    await db.politicians.update_one({"id": pid}, {"$set": {"verified": bool(payload.get("verified", True))}})
    pol = await db.politicians.find_one({"id": pid})
    return await _enrich_politician(pol)

@api_router.get("/me/contributions")
async def my_contributions(user: dict = Depends(get_current_user)):
    politicians = await db.politicians.find({"created_by": user["id"]}).sort("created_at", -1).to_list(500)
    politicians = [await _enrich_politician(p) for p in politicians]
    promises_raw = await db.promises.find({"created_by": user["id"]}).sort("created_at", -1).to_list(500)
    promises = []
    for p in promises_raw:
        p.pop("_id", None)
        pol = await db.politicians.find_one({"id": p["politician_id"]}, {"_id": 0, "name": 1, "constituency": 1})
        p["politician_name"] = pol["name"] if pol else "Unknown"
        promises.append(p)
    works_raw = await db.works.find({"created_by": user["id"]}).sort("created_at", -1).to_list(500)
    works = []
    for w in works_raw:
        w.pop("_id", None)
        pol = await db.politicians.find_one({"id": w["politician_id"]}, {"_id": 0, "name": 1})
        w["politician_name"] = pol["name"] if pol else "Unknown"
        works.append(w)
    return {"politicians": politicians, "promises": promises, "works": works}

@api_router.get("/stats/overview")
async def stats_overview():
    politicians = await db.politicians.count_documents({})
    promises = await db.promises.count_documents({})
    delivered = await db.promises.count_documents({"status": "delivered"})
    broken = await db.promises.count_documents({"status": "broken"})
    in_progress = await db.promises.count_documents({"status": "in_progress"})
    pending = await db.promises.count_documents({"status": "pending"})
    users = await db.users.count_documents({})
    return {
        "politicians": politicians,
        "promises": promises,
        "delivered": delivered,
        "broken": broken,
        "in_progress": in_progress,
        "pending": pending,
        "users": users,
    }

@api_router.get("/")
async def root():
    return {"name": "TrackMP", "ok": True}

# Include router
app.include_router(api_router)

frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", frontend_url).split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.politicians.create_index("name")
    await db.politicians.create_index("constituency")
    await db.promises.create_index("politician_id")
    await db.works.create_index("politician_id")
    await db.comments.create_index("politician_id")
    await db.ratings.create_index([("politician_id", 1), ("user_id", 1)], unique=True)
    await db.votes.create_index([("promise_id", 1), ("user_id", 1)], unique=True)

    admin_email = os.environ.get("ADMIN_EMAIL", "admin@trackmp.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": new_id(),
            "email": admin_email,
            "name": "Admin",
            "password_hash": hash_password(admin_password),
            "role": "admin",
            "created_at": now_iso(),
        })
        logger.info(f"Seeded admin: {admin_email}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
