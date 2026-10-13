#!/usr/bin/env python3
"""Refresh gear-database.json from the GOMG Wiki Search Gear page."""
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

SOURCE_URL = "https://gomg-wiki.pages.dev/search-gear"
OUTPUT = Path("gear-database.json")
MIN_RECORDS = 1000

def main():
    req = Request(SOURCE_URL, headers={"User-Agent": "GOMG-Gear-Database-Updater/1.0"})
    with urlopen(req, timeout=60) as response:
        html = response.read().decode("utf-8", errors="replace")
    match = re.search(r"const\s+GEAR\s*=\s*(\[.*?\]);", html, re.S)
    if not match:
        raise RuntimeError("Could not find embedded const GEAR array on the source page.")
    data = json.loads(match.group(1))
    if not isinstance(data, list) or len(data) < MIN_RECORDS:
        raise RuntimeError(f"Source returned only {len(data) if isinstance(data, list) else 0} gear records; refusing to overwrite database.")
    ids = [str(item.get("id", "")) for item in data if isinstance(item, dict)]
    if len(ids) != len(data) or any(not item_id for item_id in ids):
        raise RuntimeError("Some gear records are invalid or missing IDs.")
    if len(set(ids)) != len(ids):
        raise RuntimeError("Duplicate gear IDs detected; refusing to overwrite database.")
    if not all(item.get("name") for item in data):
        raise RuntimeError("Some gear records have no names; refusing to overwrite database.")
    # Keep the source's record schema intact; write atomically after all checks pass.
    temp = OUTPUT.with_suffix(".json.tmp")
    temp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temp.replace(OUTPUT)
    print(f"Updated {OUTPUT}: {len(data)} gear records at {datetime.now(timezone.utc).isoformat()}")

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"Gear update failed: {exc}", file=sys.stderr)
        sys.exit(1)
