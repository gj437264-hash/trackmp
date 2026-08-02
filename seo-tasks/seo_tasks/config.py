import os
import sys
from dataclasses import dataclass

@dataclass(frozen=True)
class Settings:
    mongodb_uri: str
    mongodb_db: str
    base_url: str
    sitemap_output_dir: str
    static_output_dir: str
    slack_webhook_url: str | None

def load_settings() -> Settings:
    required = ["MONGODB_URI", "MONGODB_DB", "BASE_URL"]
    missing = [k for k in required if not os.environ.get(k)]
    if missing:
        sys.stderr.write(f"FATAL: missing required env vars: {', '.join(missing)}\n")
        sys.exit(1)

    return Settings(
        mongodb_uri=os.environ["MONGODB_URI"],
        mongodb_db=os.environ["MONGODB_DB"],          # ONE canonical name, used everywhere
        base_url=os.environ["BASE_URL"],                # no placeholder fallback in prod
        sitemap_output_dir=os.environ.get("SITEMAP_OUTPUT_DIR", "/opt/trackmp/public"),
        static_output_dir=os.environ.get("STATIC_OUTPUT_DIR", "/opt/trackmp/public/politicians"),
        slack_webhook_url=os.environ.get("SLACK_WEBHOOK_URL"),
    )
