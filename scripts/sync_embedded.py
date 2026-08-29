#!/usr/bin/env python3
"""Resync embedded JSON constants in app/index.html from app/data/*.json.

Usage:
  python scripts/sync_embedded.py          # write mirrors into app/index.html
  python scripts/sync_embedded.py --check  # exit 0 if in sync, non-zero if not
                                           # (never modifies app/index.html)
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SPECIES_JSON = ROOT / "app" / "data" / "species.json"
EVENTS_JSON = ROOT / "app" / "data" / "events.json"
INDEX_HTML = ROOT / "app" / "index.html"

# Unique sentinels — must appear exactly once each in app/index.html.
# sync_embedded.py refuses to run if any marker is missing or duplicated,
# so a stray banner comment can never truncate an embedded block.
BEGIN_SPECIES = "// === BEGIN_EMBEDDED_SPECIES ==="
END_SPECIES = "// === END_EMBEDDED_SPECIES ==="
BEGIN_EVENTS = "// === BEGIN_EMBEDDED_EVENTS ==="
END_EVENTS = "// === END_EMBEDDED_EVENTS ==="

MARKERS = (BEGIN_SPECIES, END_SPECIES, BEGIN_EVENTS, END_EVENTS)


def _require_unique_markers(html: str) -> None:
    missing = [m for m in MARKERS if html.count(m) != 1]
    if missing:
        raise SystemExit(
            "ERROR: embedded-data sentinels missing or not unique in "
            f"{INDEX_HTML.relative_to(ROOT)}: {missing}"
        )


def _block_between(html: str, begin: str, end: str) -> str:
    """Return the text strictly between unique begin/end markers."""
    i = html.index(begin) + len(begin)
    j = html.index(end)
    if j < i:
        raise SystemExit(f"ERROR: sentinel {end!r} appears before {begin!r}")
    return html[i:j]


def _parse_const_json(block: str, name: str) -> dict:
    """Parse `const NAME = <json>;` from a sentinel-bounded block."""
    start = f"const {name} = "
    text = block.strip()
    if not text.startswith(start):
        raise SystemExit(
            f"ERROR: expected block to start with {start!r}, got {text[:60]!r}…"
        )
    if not text.endswith(";"):
        raise SystemExit(f"ERROR: expected {name} block to end with ';'")
    payload = text[len(start) : -1].strip()
    return json.loads(payload)


def _extract_embedded(html: str) -> tuple[dict, dict]:
    _require_unique_markers(html)
    species = _parse_const_json(
        _block_between(html, BEGIN_SPECIES, END_SPECIES), "_EMBEDDED_SPECIES"
    )
    events = _parse_const_json(
        _block_between(html, BEGIN_EVENTS, END_EVENTS), "_EMBEDDED_EVENTS"
    )
    return species, events


def _format_const(name: str, value: dict) -> str:
    dumped = json.dumps(value, ensure_ascii=False, indent=2)
    return f"const {name} = {dumped};"


def _replace_block(html: str, begin: str, end: str, body: str) -> str:
    """Replace content between markers (exclusive) with body + surrounding newlines."""
    i = html.index(begin) + len(begin)
    j = html.index(end)
    return html[:i] + "\n" + body + "\n" + html[j:]


def load_sources() -> tuple[dict, dict]:
    species = json.loads(SPECIES_JSON.read_text(encoding="utf-8"))
    events = json.loads(EVENTS_JSON.read_text(encoding="utf-8"))
    return species, events


def check() -> int:
    """Return 0 if JSON files match embedded mirrors; 1 otherwise. Never writes."""
    species, events = load_sources()
    html = INDEX_HTML.read_text(encoding="utf-8")
    try:
        emb_species, emb_events = _extract_embedded(html)
    except SystemExit as exc:
        print(exc, file=sys.stderr)
        return 1

    ok = True
    if emb_species != species:
        print(
            "DIVERGE: app/data/species.json does not match _EMBEDDED_SPECIES "
            f"({len(species.get('itemListElement', []))} file vs "
            f"{len(emb_species.get('itemListElement', []))} embedded).",
            file=sys.stderr,
        )
        ok = False
    if emb_events != events:
        print(
            "DIVERGE: app/data/events.json does not match _EMBEDDED_EVENTS "
            f"({len(events.get('itemListElement', []))} file vs "
            f"{len(emb_events.get('itemListElement', []))} embedded).",
            file=sys.stderr,
        )
        ok = False

    if ok:
        print(
            "OK — embedded JSON matches app/data/ "
            f"({len(species['itemListElement'])} species, "
            f"{len(events['itemListElement'])} events)."
        )
        return 0

    print(
        "Run `python scripts/sync_embedded.py` (without --check) to resync.",
        file=sys.stderr,
    )
    return 1


def sync() -> int:
    """Rewrite embedded mirrors from app/data/*.json. Returns 0."""
    species, events = load_sources()
    html = INDEX_HTML.read_text(encoding="utf-8")
    _require_unique_markers(html)

    new_html = _replace_block(
        html, BEGIN_SPECIES, END_SPECIES, _format_const("_EMBEDDED_SPECIES", species)
    )
    new_html = _replace_block(
        new_html, BEGIN_EVENTS, END_EVENTS, _format_const("_EMBEDDED_EVENTS", events)
    )

    if new_html == html:
        print("No change needed.")
    else:
        INDEX_HTML.write_text(new_html, encoding="utf-8")
        print(
            "OK — embedded JSON resynced "
            f"({len(species['itemListElement'])} species, "
            f"{len(events['itemListElement'])} events)."
        )
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Sync or check embedded JSON mirrors in app/index.html."
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Read-only: exit 0 if in sync, non-zero if JSON and embedded data diverge.",
    )
    args = parser.parse_args(argv)
    return check() if args.check else sync()


if __name__ == "__main__":
    sys.exit(main())
