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
