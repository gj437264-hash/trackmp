import json
import logging
import urllib.request
from .config import load_settings

def slack_notify(message: str):
    settings = load_settings()
    if not settings.slack_webhook_url:
        return
    try:
        req = urllib.request.Request(
            settings.slack_webhook_url,
            data=json.dumps({"text": message}).encode(),
            headers={"Content-Type": "application/json"},
        )
        urllib.request.urlopen(req, timeout=5)
    except Exception as e:
        logging.getLogger(__name__).warning(f"Slack notify failed: {e}")
