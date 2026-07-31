# SEO_Setup.MD

## SEO Tasks Automation: A Unified Python Solution with Systemd Integration

### Overview

A unified Python package with subcommands, orchestrated by systemd timers (not cron), with no separate Bash layer. This consolidates four disparate scripts into a single, maintainable codebase with shared configuration, logging, locking, and retry logic.

---

## Why This Architecture Beats the Alternatives

| Option | Verdict | Rationale |
|--------|---------|-----------|
| **Separate scripts (status quo)** | ❌ **Rejected** | Current bug source: 4 copies of Mongo-connection logic, 3 different env var names, no shared logging/locking. |
| **Bash wrapper around Python scripts** | ❌ **Rejected** | Would reimplement locking, retries, and error-branching in Bash—worse at all three than Python's stdlib. Bash should only glue processes together; here the processes need to share state (config, logger, retry policy). |
| **Pure Bash implementation** | ❌ **Rejected** | MongoDB queries and templated HTML/XML generation have no safe Bash implementation without shelling out to Python. |
| **Single Python app, subcommands, systemd timers** | ✅ **Recommended** | Mirrors your existing TrackMP pattern; systemd timers provide locking, structured logs, and failure hooks for free. |

---

## Directory Structure
/opt/trackmp/seo-tasks/
├── seo_tasks/
│ ├── init.py
│ ├── cli.py # argparse entrypoint: backfill-slugs | static-pages | sitemap | run-all
│ ├── config.py # loads & validates all env vars in ONE place, fails fast
│ ├── db.py # single get_db() with connection retry
│ ├── logging_setup.py # rotating file handler + console (captured by journald)
│ ├── notify.py # slack_notify()
│ ├── lockfile.py # flock-based single-instance guard
│ ├── retry.py # @retry decorator, stdlib only
│ ├── atomic_write.py # tmp-file + os.replace() helper
│ ├── state.py # reads/writes seo_state collection (last-run timestamps)
│ └── tasks/
│ ├── init.py
│ ├── backfill_slugs.py
│ ├── static_pages.py # merged generate_static_pages.py + html-build.py
│ └── sitemap.py
├── requirements.txt # pymongo only — nothing else new
├── .env # chmod 600, same style as the main app's .env
├── logs/ # rotated, gitignored
├── run/ # lock file + heartbeat.json
└── systemd/
├── trackmp-seo.service
└── trackmp-seo.timer

text

---

## Merge Decisions

| Current File | Action |
|--------------|--------|
| `generate_static_pages.py` | Keep as canonical, move logic into `tasks/static_pages.py` |
| `html-build.py` | **Delete**. Duplicate with different env var name—exact kind of drift that caused KeyError |
| `generate_sitemap.py` | Move into `tasks/sitemap.py`, fix hardcoded DB name, add change detection |
| `backfill_slugs.py` | Move into `tasks/backfill_slugs.py`, kept as pre-step, not independent schedule |

All four collapse into one CLI with three subcommands, invoked as one pipeline (`run-all`) by systemd, each step independently retried/logged.

---

## Shared Modules Implementation

### config.py

One place all env vars are read and validated, so a missing var fails loudly and immediately:

```python
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
        base_url=os.environ["BASE_URL"],              # no placeholder fallback in prod
        sitemap_output_dir=os.environ.get("SITEMAP_OUTPUT_DIR", "/opt/trackmp/public"),
        static_output_dir=os.environ.get("STATIC_OUTPUT_DIR", "/opt/trackmp/public/politicians"),
        slack_webhook_url=os.environ.get("SLACK_WEBHOOK_URL"),
    )
db.py
python
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
retry.py
Stdlib only, per "no unnecessary deps" constraint:

python
import time
import logging
import functools

def retry(exceptions, attempts=3, base_delay=2):
    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            log = logging.getLogger(fn.__module__)
            for attempt in range(1, attempts + 1):
                try:
                    return fn(*args, **kwargs)
                except exceptions as e:
                    if attempt == attempts:
                        log.error(f"{fn.__name__} failed after {attempts} attempts: {e}")
                        raise
                    delay = base_delay * (2 ** (attempt - 1))
                    log.warning(f"{fn.__name__} failed (attempt {attempt}/{attempts}): {e} — retrying in {delay}s")
                    time.sleep(delay)
        return wrapper
    return decorator
atomic_write.py
Closes the "truncated file served to Googlebot" gap:

python
import os
import tempfile

def atomic_write(path: str, content: str, encoding="utf-8"):
    directory = os.path.dirname(path)
    fd, tmp_path = tempfile.mkstemp(dir=directory, prefix=".tmp-")
    try:
        with os.fdopen(fd, "w", encoding=encoding) as f:
            f.write(content)
        os.replace(tmp_path, path)  # atomic on the same filesystem
    except Exception:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        raise
lockfile.py
python
import fcntl
import os
import sys

class SingleInstance:
    def __init__(self, path="run/seo-tasks.lock"):
        self.path = path
        self.fh = None

    def __enter__(self):
        os.makedirs(os.path.dirname(self.path), exist_ok=True)
        self.fh = open(self.path, "w")
        try:
            fcntl.flock(self.fh, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            sys.stderr.write("Another run is already in progress — exiting.\n")
            sys.exit(3)  # distinct exit code = "skipped, not a failure"
        self.fh.write(str(os.getpid()))
        self.fh.flush()
        return self

    def __exit__(self, *a):
        fcntl.flock(self.fh, fcntl.LOCK_UN)
        self.fh.close()
Note: The "dead lock file after a crash" problem is self-healing—flock releases automatically when the holding process dies, so a stale PID in the file is harmless.

state.py
Powers change-detection so you stop doing full-collection work every run:

python
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
tasks/static_pages.py
Queries {"updatedAt": {"$gt": last_run}} instead of the full collection, and only calls set_last_run after every page in the batch wrote successfully—so an interrupted run just reprocesses the same window next time.

notify.py
Stdlib urllib, no requests dependency needed:

python
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
cli.py
Exit codes are the monitoring contract with systemd:

python
import argparse
import sys
import logging
from .logging_setup import setup_logging
from .lockfile import SingleInstance
from .notify import slack_notify
from .tasks import backfill_slugs, static_pages, sitemap

TASKS = {
    "backfill-slugs": backfill_slugs.run,
    "static-pages": static_pages.run,
    "sitemap": sitemap.run,
}

def run_all():
    results = {}
    for name, fn in TASKS.items():
        try:
            results[name] = fn()
        except Exception as e:
            logging.getLogger(name).exception(f"{name} failed")
            slack_notify(f":x: TrackMP SEO task `{name}` failed: {e}")
            results[name] = False
    if all(results.values()):
        return 0
    if any(results.values()):
        return 2   # partial failure
    return 1        # total failure

def main():
    parser = argparse.ArgumentParser(prog="seo-tasks")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("run-all")
    for name in TASKS:
        sub.add_parser(name)
    args = parser.parse_args()

    setup_logging()
    with SingleInstance():
        if args.command == "run-all":
            sys.exit(run_all())
        else:
            sys.exit(0 if TASKS[args.command]() else 1)

if __name__ == "__main__":
    main()
Exit Code Contract:

0: Success

1: Hard failure

2: Partial success

3: Skipped (lock held)

Scheduling: Systemd Timers (Recommended)
systemd/trackmp-seo.service
ini
[Unit]
Description=TrackMP SEO maintenance (slugs, static pages, sitemap)
After=network-online.target mongod.service
Wants=network-online.target

[Service]
Type=oneshot
User=trackmp
Group=trackmp
WorkingDirectory=/opt/trackmp/seo-tasks
EnvironmentFile=/opt/trackmp/seo-tasks/.env
ExecStart=/opt/trackmp/seo-tasks/venv/bin/python -m seo_tasks.cli run-all
TimeoutStartSec=30min
OnFailure=trackmp-seo-alert.service
systemd/trackmp-seo.timer
ini
[Unit]
Description=Run TrackMP SEO maintenance daily

[Timer]
OnCalendar=*-*-* 03:00:00
RandomizedDelaySec=300
Persistent=true

[Install]
WantedBy=timers.target
Persistent=true covers the case where the VPS was rebooted/down at 3am—it fires the missed run at next boot instead of silently skipping a day.

Cron Fallback (Optional)
If you'd rather not add units at all:

cron
0 3 * * * cd /opt/trackmp/seo-tasks && ./venv/bin/python -m seo_tasks.cli run-all >> logs/cron.log 2>&1
Note: You lose OnFailure=, Persistent=, and journald integration with cron.

Frequency Guidance: backfill-slugs and sitemap are cheap and idempotent—daily at 3am is fine. Start daily and dial back once you see actual run times in the logs.

Logging Strategy
logging_setup.py
python
import logging
from logging.handlers import RotatingFileHandler

def setup_logging():
    root = logging.getLogger()
    root.setLevel(logging.INFO)

    fmt = logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s")

    file_handler = RotatingFileHandler(
        "logs/seo-tasks.log", maxBytes=10 * 1024 * 1024, backupCount=5
    )
    file_handler.setFormatter(fmt)
    root.addHandler(file_handler)

    console = logging.StreamHandler()  # captured by journald under systemd
    console.setFormatter(fmt)
    root.addHandler(console)
journalctl -u trackmp-seo.service -f for live monitoring

journalctl -u trackmp-seo.service --since today for daily check

File log gives durable trail independent of journald's retention policy

Error Handling Strategy
@retry wraps only network/Mongo I/O (3 attempts, exponential backoff)—not templating/file logic

Each task in run_all() is isolated in its own try/except so one failing task doesn't prevent others

Distinct exit codes (0/1/2/3) let systemd's OnFailure= distinguish failure modes

Slack notification fires only on actual task failure, not on lock-skip (routine, not exceptional)

Backup & Recovery Considerations
Atomic writes (tmp+os.replace) mean a crash mid-run never leaves a truncated file live

Stale file cleanup in sitemap.py: after writing this run's sitemap-politicians-{1..N}.xml, list existing files matching that pattern and delete any with an index beyond N

State collection (seo_state) is your recovery bookmark—an interrupted run simply hasn't advanced last_run, so the next run naturally reprocesses the same window

No data deletion or mutation of politician data itself—all writes are either new slugs or files under public/

Deployment Instructions
1. Create Application Directory & User
bash
# Create dedicated low-privilege user
useradd --system --home /opt/trackmp/seo-tasks --shell /usr/sbin/nologin trackmp
mkdir -p /opt/trackmp/seo-tasks/{logs,run}
chown -R trackmp:trackmp /opt/trackmp/seo-tasks
2. Deploy Code
bash
cd /opt/trackmp/seo-tasks
python3 -m venv venv
./venv/bin/pip install pymongo
3. Configure Environment
bash
# .env — same convention as your main app
cat > .env <<'EOF'
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=trackmp
BASE_URL=https://trackmp.example.com
SITEMAP_OUTPUT_DIR=/opt/trackmp/public
STATIC_OUTPUT_DIR=/opt/trackmp/public/politicians
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
EOF
chmod 600 .env
chown trackmp:trackmp .env
4. Install Systemd Units
bash
cp systemd/trackmp-seo.service systemd/trackmp-seo.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now trackmp-seo.timer
5. Verify Installation
bash
systemctl list-timers trackmp-seo.timer
systemctl start trackmp-seo.service   # manual first run
journalctl -u trackmp-seo.service -f
Security Considerations
This runs as a dedicated trackmp user with least privilege—it only needs write access to public/ and its own logs//run/ directories, not full root.

Dependencies
pymongo — already required, no change

Everything else (argparse, logging, fcntl, tempfile, urllib) is Python stdlib

No OS packages beyond Python 3.9+ and systemd (both already present)

Migration Plan
Phase 1: Scaffold
Scaffold seo_tasks/ with the shared modules above; no task logic yet.

Phase 2: Port Backfill Slugs
Port backfill_slugs.py first (lowest risk, already idempotent) into tasks/backfill_slugs.py, using config.py/db.py.

bash
python -m seo_tasks.cli backfill-slugs
Diff behavior against the old script on a dry run.

Phase 3: Port Static Pages
Port generate_static_pages.py into tasks/static_pages.py, add updatedAt-based change detection and atomic writes.
Run manually against a copy of STATIC_OUTPUT_DIR first, diff output against current production pages for a sample.

Phase 4: Port Sitemap
Port generate_sitemap.py into tasks/sitemap.py, fix hardcoded DB name, add atomic writes + stale-file cleanup.
Validate generated sitemap.xml against the current one (should be structurally identical on a no-op run).

Phase 5: Integration
Wire up cli.py run-all, lockfile.py, logging_setup.py.
Run run-all manually once, check logs/seo-tasks.log and exit code.

Phase 6: Production Deployment
Install systemd units, enable the timer, do one full end-to-end cycle:

bash
systemctl start trackmp-seo.service
journalctl -u trackmp-seo.service -f
Phase 7: Decommission Old Scripts
Move four old scripts to an archive/ folder rather than deleting (for diff reference).

Phase 8: Monitoring
Let it run unattended for a week, watching logs and Slack notifications, before considering it "done."

Troubleshooting
Issue	Solution
Missing env var	Check .env file and ensure it's readable by trackmp user
Permission denied	Verify ownership: chown -R trackmp:trackmp /opt/trackmp/seo-tasks
Lock file stuck	flock releases on process death—if concerned, manually remove run/seo-tasks.lock
MongoDB connection	Verify mongod.service is running and connection string is correct
Task failing	Check journalctl -u trackmp-seo.service -n 50 for detailed logs
Sitemap not updating	Verify SITEMAP_OUTPUT_DIR path exists and is writable
Monitoring & Alerting
Slack notifications on task failure (configure SLACK_WEBHOOK_URL)

Journald integration for real-time monitoring

Rotating file logs for historical analysis

Systemd OnFailure hooks for additional alerting (optional)

Exit codes enable external monitoring (e.g., Prometheus node_exporter textfile collector)

text
