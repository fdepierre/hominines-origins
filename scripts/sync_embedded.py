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

def replace_const(source: str, name: str, value: dict, next_prefix: str) -> str:
    """Replace a pretty-printed `const NAME = …;` block, stopping at next_prefix."""
    start = f"const {name} = "
    i = source.index(start)
    j = source.index(next_prefix, i + len(start))
    dumped = json.dumps(value, ensure_ascii=False, indent=2)
    return source[:i] + start + dumped + ";" + source[j:]

new_html = replace_const(html, "_EMBEDDED_SPECIES", species, "\nconst _EMBEDDED_EVENTS")
new_html = replace_const(new_html, "_EMBEDDED_EVENTS", events, "\n\n// =====================================================================")

if new_html == html:
    print("No change needed.")
else:
    INDEX_HTML.write_text(new_html, encoding="utf-8")
    print(
        "OK — embedded JSON resynced "
        f"({len(species['itemListElement'])} species, {len(events['itemListElement'])} events)."
    )
