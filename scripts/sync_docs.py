#!/usr/bin/env python3
"""Copy editorial Markdown into app/docs/ so GitHub Pages can serve it.

Usage:
  python scripts/sync_docs.py          # write copies into app/docs/
  python scripts/sync_docs.py --check  # exit 0 if in sync, non-zero if not
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCS_DIR = ROOT / "app" / "docs"

# (destination filename in app/docs/, source path)
DOC_MAP = (
    ("README.md", ROOT / "README.md"),
    ("data-README.md", ROOT / "data" / "README.md"),
    (
        "Hominins-Morphology-Pigmentation.md",
        ROOT / "data" / "Hominins-Morphology-Pigmentation.md",
    ),
    (
        "Prehistoric-Chronology-Scientific-Reference.md",
        ROOT / "data" / "Prehistoric-Chronology-Scientific-Reference.md",
    ),
)


def check() -> int:
    missing: list[str] = []
    diverge: list[str] = []
    for dest_name, src in DOC_MAP:
        dest = DOCS_DIR / dest_name
        if not src.is_file():
            missing.append(f"source missing: {src.relative_to(ROOT)}")
            continue
        if not dest.is_file():
            missing.append(f"copy missing: {dest.relative_to(ROOT)}")
            continue
        if dest.read_text(encoding="utf-8") != src.read_text(encoding="utf-8"):
            diverge.append(dest_name)
    if missing or diverge:
        for line in missing + [f"out of date: {n}" for n in diverge]:
            print(f"DIVERGE  {line}", file=sys.stderr)
        print("Run `python scripts/sync_docs.py` (without --check) to resync.", file=sys.stderr)
        return 1
    print(f"OK — app/docs/ matches editorial Markdown ({len(DOC_MAP)} files).")
    return 0


def sync() -> int:
    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    written = 0
    for dest_name, src in DOC_MAP:
        dest = DOCS_DIR / dest_name
        text = src.read_text(encoding="utf-8")
        if not dest.is_file() or dest.read_text(encoding="utf-8") != text:
            dest.write_text(text, encoding="utf-8")
            written += 1
    readme = DOCS_DIR / "README.md"
    # The project README is copied as README.md; do not add a second index.
    print(
        f"OK — app/docs/ resynced ({len(DOC_MAP)} files"
        + (f", {written} written" if written else ", no change")
        + ")."
    )
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="read-only comparison")
    args = parser.parse_args()
    return check() if args.check else sync()


if __name__ == "__main__":
    sys.exit(main())
