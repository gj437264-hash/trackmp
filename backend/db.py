"""Database, Base document + PyObjectId helper for MongoDB."""
from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Annotated, Any, Optional

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, BeforeValidator, ConfigDict, Field


def _validate_object_id(v: Any) -> str:
    if isinstance(v, ObjectId):
        return str(v)
    if isinstance(v, str) and ObjectId.is_valid(v):
        return v
    raise ValueError(f"Invalid ObjectId: {v!r}")


PyObjectId = Annotated[str, BeforeValidator(_validate_object_id)]


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class BaseDocument(BaseModel):
    """All Mongo documents extend this."""

    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    created_at: str = Field(default_factory=utcnow_iso)
    updated_at: str = Field(default_factory=utcnow_iso)
    deleted_at: Optional[str] = None

    def to_mongo(self) -> dict:
        data = self.model_dump(by_alias=True, exclude_none=True)
        if "_id" in data and data["_id"] is not None:
            data["_id"] = ObjectId(data["_id"])
        else:
            data.pop("_id", None)
        return data

    @classmethod
    def from_mongo(cls, doc: dict | None):
        if doc is None:
            return None
        d = dict(doc)
        if "_id" in d:
            d["_id"] = str(d["_id"])
        return cls(**d)


_client: Optional[AsyncIOMotorClient] = None


def get_db():
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    return _client[os.environ["DB_NAME"]]


def close_db():
    global _client
    if _client is not None:
        _client.close()
        _client = None
