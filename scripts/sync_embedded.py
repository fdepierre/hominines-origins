"""Resync the _EMBEDDED_SPECIES constant in app/index.html with app/data/species.json.

The events constant is left untouched (already bilingual).
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SPECIES_JSON = ROOT / "app" / "data" / "species.json"
INDEX_HTML = ROOT / "app" / "index.html"

species = json.loads(SPECIES_JSON.read_text(encoding="utf-8"))
html = INDEX_HTML.read_text(encoding="utf-8")

START = "const _EMBEDDED_SPECIES = "
END_MARKER = ";\nconst _EMBEDDED_EVENTS"

before, rest = html.split(START, 1)
_, after = rest.split(END_MARKER, 1)

new_html = (
    before
    + START
    + json.dumps(species, ensure_ascii=False)
    + END_MARKER
    + after
)

if new_html == html:
    print("No change needed.")
else:
    INDEX_HTML.write_text(new_html, encoding="utf-8")
    print(f"OK — _EMBEDDED_SPECIES resynced from {SPECIES_JSON.name} ({len(species['itemListElement'])} species).")
