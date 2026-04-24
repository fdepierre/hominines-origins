"""Resync embedded JSON constants in app/index.html from app/data/*.json."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SPECIES_JSON = ROOT / "app" / "data" / "species.json"
EVENTS_JSON = ROOT / "app" / "data" / "events.json"
INDEX_HTML = ROOT / "app" / "index.html"

species = json.loads(SPECIES_JSON.read_text(encoding="utf-8"))
events = json.loads(EVENTS_JSON.read_text(encoding="utf-8"))
html = INDEX_HTML.read_text(encoding="utf-8")

def replace_const(source: str, start: str, value: dict, end_marker: str) -> str:
    before, rest = source.split(start, 1)
    _, after = rest.split(end_marker, 1)
    return before + start + json.dumps(value, ensure_ascii=False) + end_marker + after

new_html = replace_const(html, "const _EMBEDDED_SPECIES = ", species, ";\nconst _EMBEDDED_EVENTS")
new_html = replace_const(new_html, "const _EMBEDDED_EVENTS  = ", events, ";\n\n// =====================================================================")

if new_html == html:
    print("No change needed.")
else:
    INDEX_HTML.write_text(new_html, encoding="utf-8")
    print(
        "OK — embedded JSON resynced "
        f"({len(species['itemListElement'])} species, {len(events['itemListElement'])} events)."
    )
