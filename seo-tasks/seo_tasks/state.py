from datetime import datetime, timezone
from .db import get_db

def get_last_run(task_name: str):
    doc = get_db()["seo_state"].find_one({"_id": task_name})
    return doc["last_run"] if doc else None

def set_last_run(task_name: str, when: datetime = None):
    when = when or datetime.now(timezone.utc)
    get_db()["seo_state"].update_one(
        {"_id": task_name}, {"$set": {"last_run": when}}, upsert=True
    )
