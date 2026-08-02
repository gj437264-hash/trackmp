"""
Sitemap generator for politician profiles.
Full regenerate each run (cheap at current scale), with atomic writes
and cleanup of stale sitemap chunk files from previous, larger runs.
"""

import os
import gzip
import glob
import shutil
import logging
from datetime import datetime, timezone
from xml.sax.saxutils import escape as xml_escape
from ..db import get_db
from ..config import load_settings
from ..atomic_write import atomic_write
from ..retry import retry
from pymongo.errors import PyMongoError

log = logging.getLogger(__name__)
URLS_PER_SITEMAP = 45000
BATCH_SIZE = 2000


def iso_date(dt):
    if not dt:
        return datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return dt.strftime("%Y-%m-%d")


def render_sitemap(url_entries) -> str:
    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for loc, lastmod, changefreq, priority in url_entries:
        lines += [
            "  <url>",
            f"    <loc>{xml_escape(loc)}</loc>",
            f"    <lastmod>{lastmod}</lastmod>",
            f"    <changefreq>{changefreq}</changefreq>",
            f"    <priority>{priority}</priority>",
            "  </url>",
        ]
    lines.append("</urlset>")
    return "\n".join(lines) + "\n"


def write_sitemap_file(path: str, url_entries):
    atomic_write(path, render_sitemap(url_entries))
    with open(path, "rb") as f_in, gzip.open(f"{path}.gz", "wb") as f_out:
        shutil.copyfileobj(f_in, f_out)


def generate_politician_sitemaps(politicians, base_url, output_dir):
    projection = {"_id": 1, "slug": 1, "updatedAt": 1}
    cursor = politicians.find({}, projection).batch_size(BATCH_SIZE)

    sitemap_files = []
    chunk = []
    file_index = 1

    def flush_chunk():
        nonlocal chunk, file_index
        if not chunk:
            return
        filename = f"sitemap-politicians-{file_index}.xml"
        write_sitemap_file(os.path.join(output_dir, filename), chunk)
        sitemap_files.append(filename)
        chunk = []
        file_index += 1

    for doc in cursor:
        slug = doc.get("slug") or str(doc["_id"])
        loc = f"{base_url}/politicians/{slug}"
        chunk.append((loc, iso_date(doc.get("updatedAt")), "weekly", "0.9"))
        if len(chunk) >= URLS_PER_SITEMAP:
            flush_chunk()
    flush_chunk()

    # Remove stale chunk files beyond what this run produced
    existing = glob.glob(os.path.join(output_dir, "sitemap-politicians-*.xml"))
    keep = {os.path.join(output_dir, f) for f in sitemap_files}
    for path in existing:
        if path not in keep:
            os.remove(path)
            gz = f"{path}.gz"
            if os.path.exists(gz):
                os.remove(gz)
            log.info(f"Removed stale sitemap file: {path}")

    return sitemap_files


def generate_static_page_sitemaps(base_url, output_dir):
    static_routes = [
        ("/", "1.0", "daily"),
        ("/about", "0.6", "monthly"),
        ("/contact", "0.6", "monthly"),
        ("/articles", "0.8", "daily"),
    ]
    entries = [(f"{base_url}{route}", iso_date(None), freq, priority)
               for route, priority, freq in static_routes]
    write_sitemap_file(os.path.join(output_dir, "sitemap-static.xml"), entries)
    return ["sitemap-static.xml"]


def generate_sitemap_index(base_url, output_dir, sitemap_filenames):
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for name in sitemap_filenames:
        lines += ["  <sitemap>", f"    <loc>{base_url}/{name}</loc>",
                  f"    <lastmod>{now}</lastmod>", "  </sitemap>"]
    lines.append("</sitemapindex>")
    atomic_write(os.path.join(output_dir, "sitemap.xml"), "\n".join(lines) + "\n")
    log.info(f"sitemap index written ({len(sitemap_filenames)} sub-sitemaps)")


@retry(exceptions=(PyMongoError,), attempts=3, base_delay=2)
def run() -> bool:
    settings = load_settings()
    db = get_db()
    politicians = db["politicians"]
    output_dir = settings.sitemap_output_dir
    os.makedirs(output_dir, exist_ok=True)

    files = []
    files += generate_static_page_sitemaps(settings.base_url, output_dir)
    files += generate_politician_sitemaps(politicians, settings.base_url, output_dir)
    generate_sitemap_index(settings.base_url, output_dir, files)
    return True
