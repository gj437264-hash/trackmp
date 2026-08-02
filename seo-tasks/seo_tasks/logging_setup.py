# seo_tasks/logging_setup.py
import logging
import os
from pathlib import Path
from logging.handlers import RotatingFileHandler

def setup_logging():
    root = logging.getLogger()
    root.setLevel(logging.INFO)

    fmt = logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s")

    log_dir = Path(__file__).resolve().parent.parent / "logs"  # /opt/trackmp/seo-tasks/logs
    log_dir.mkdir(parents=True, exist_ok=True)                  # self-heals if missing

    file_handler = RotatingFileHandler(
        log_dir / "seo-tasks.log", maxBytes=10 * 1024 * 1024, backupCount=5
    )
    file_handler.setFormatter(fmt)
    root.addHandler(file_handler)

    console = logging.StreamHandler()
    console.setFormatter(fmt)
    root.addHandler(console)
