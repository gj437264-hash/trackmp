from functools import lru_cache
from pymongo import MongoClient
from pymongo.errors import PyMongoError
from .config import load_settings
from .retry import retry

@lru_cache
def get_client() -> MongoClient:
    settings = load_settings()
    return MongoClient(settings.mongodb_uri, serverSelectionTimeoutMS=5000)

def get_db():
    settings = load_settings()
    return get_client()[settings.mongodb_db]

@retry(exceptions=(PyMongoError,), attempts=3, base_delay=2)
def ping():
    get_client().admin.command("ping")
