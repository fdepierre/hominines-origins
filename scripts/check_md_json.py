#!/usr/bin/env python3
"""Check that catalogue JSON matches editorial Markdown tokens.

Compares:

* every species/event ``@id`` to a Markdown catalogue ``id``
* JSON DOIs to the DOI set of the paired Markdown row or footnote list
* event ``hominin:debateLevel`` / ``hominin:evidenceType`` to Markdown tokens
* species taxonomy / behavior / pigmentation DebateLevel and EvidenceType tokens
  to the catalogue identifier map

Editorial-only rows (id ``—`` or empty) are ignored. ``UNASSESSED`` is allowed
on events only when the Markdown row says so.

Read-only. Non-zero exit when any class of mismatch is non-empty.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SPECIES_JSON = ROOT / "app" / "data" / "species.json"
EVENTS_JSON = ROOT / "app" / "data" / "events.json"
CHRONOLOGY_MD = ROOT / "data" / "Prehistoric-Chronology-Scientific-Reference.md"
MORPHOLOGY_MD = ROOT / "data" / "Hominins-Morphology-Pigmentation.md"

DOI_RE = re.compile(r"10\.\d{4,9}/[^\s)\]|,;\"'<>`]+")
TRAILING = ".,;:)\"'`"
FOOTNOTE_DEF_RE = re.compile(r"^\[\^([^\]]+)\]:\s*(.*)$")
EDITORIAL_IDS = {"", "—", "-", "–", "n/a", "na"}
DEBATE_VALUES = {
    "STRONG_CONSENSUS",
    "MODERATE_CONSENSUS",
    "ACTIVE_DEBATE",
    "SPECULATIVE_HYPOTHESIS",
    "UNASSESSED",
}
EVIDENCE_VALUES = {
    "DIRECT_DATA",
    "INDIRECT_DATA",
    "EVOLUTIONARY_INFERENCE",
    "MEDIA_NARRATIVE",
    "UNASSESSED",
}


def dois_in(text: str) -> set[str]:
    return {raw.rstrip(TRAILING) for raw in DOI_RE.findall(text)}


def split_row(line: str) -> list[str]:
    line = line.strip()
    if line.startswith("|"):
        line = line[1:]
    if line.endswith("|"):
        line = line[:-1]
    return [cell.strip() for cell in line.split("|")]


def is_separator(cells: list[str]) -> bool:
    return bool(cells) and all(re.fullmatch(r":?-{3,}:?", c.replace(" ", "")) for c in cells if c)


def parse_tables(text: str) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    lines = text.splitlines()
    i = 0
    while i < len(lines):
        if "|" not in lines[i]:
            i += 1
            continue
        header = split_row(lines[i])
        if i + 1 >= len(lines) or not is_separator(split_row(lines[i + 1])):
            i += 1
            continue
        keys = [h.strip() for h in header]
        i += 2
        while i < len(lines) and "|" in lines[i] and not is_separator(split_row(lines[i])):
            cells = split_row(lines[i])
            record = {keys[j]: cells[j] if j < len(cells) else "" for j in range(len(keys))}
            rows.append(record)
            i += 1
    return rows


def catalogue_id(row: dict[str, str]) -> str:
    return (row.get("id") or "").strip()


def is_catalogue(row: dict[str, str]) -> bool:
    return catalogue_id(row).lower() not in EDITORIAL_IDS


def chronology_index(text: str) -> dict[str, dict]:
    found: dict[str, dict] = {}
    for row in parse_tables(text):
        if "DebateLevel" not in row or "EvidenceType" not in row:
            continue
        if not is_catalogue(row):
            continue
        cid = catalogue_id(row)
        blob = " ".join(row.values())
        found[cid] = {
            "debate": row.get("DebateLevel", "").strip().strip("`"),
            "evidence": row.get("EvidenceType", "").strip().strip("`"),
            "dois": dois_in(blob),
        }
    return found


def footnote_dois(text: str) -> dict[str, set[str]]:
    found: dict[str, set[str]] = {}
    for line in text.splitlines():
        match = FOOTNOTE_DEF_RE.match(line.strip())
        if not match:
            continue
        found[match.group(1)] = dois_in(match.group(2))
    return found


SPECIES_TOKEN_COLS = (
    ("TaxonomyDebateLevel", "hominin:taxonomyDebateLevel"),
    ("TaxonomyEvidenceType", "hominin:taxonomyEvidenceType"),
    ("BehaviorDebateLevel", "hominin:behaviorDebateLevel"),
    ("BehaviorEvidenceType", "hominin:behaviorEvidenceType"),
    ("PigmentationDebateLevel", "hominin:pigmentationDebateLevel"),
    ("PigmentationEvidenceType", "hominin:pigmentationEvidenceType"),
)


def morphology_index(text: str) -> dict[str, dict]:
    notes = footnote_dois(text)
    found: dict[str, dict] = {}
    for row in parse_tables(text):
        if "Footnotes" not in row:
            continue
        if not is_catalogue(row):
            continue
        cid = catalogue_id(row)
        dois: set[str] = set()
        for token in re.split(r"[,;]", row.get("Footnotes", "")):
            key = token.strip()
            if not key:
                continue
            if key not in notes:
                dois.add(f"MISSING_FOOTNOTE:{key}")
                continue
            dois |= notes[key]
        tokens = {
            json_key: row.get(md_col, "").strip().strip("`")
            for md_col, json_key in SPECIES_TOKEN_COLS
        }
        found[cid] = {"dois": dois, "tokens": tokens}
    return found


def json_event_dois(item: dict) -> set[str]:
    return dois_in(item.get("hominin:dateReference") or "")


def json_species_dois(item: dict) -> set[str]:
    dois: set[str] = set()
    for ref in item.get("hominin:references") or []:
        if isinstance(ref, dict):
            dois |= dois_in(json.dumps(ref, ensure_ascii=False))
        else:
            dois |= dois_in(str(ref))
    return dois


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--quiet", action="store_true", help="only print problems")
    args = parser.parse_args()

    species = json.loads(SPECIES_JSON.read_text(encoding="utf-8"))["itemListElement"]
    events = json.loads(EVENTS_JSON.read_text(encoding="utf-8"))["itemListElement"]
    chrono = chronology_index(CHRONOLOGY_MD.read_text(encoding="utf-8"))
    morpho = morphology_index(MORPHOLOGY_MD.read_text(encoding="utf-8"))

    problems: list[str] = []

    event_ids = [item["@id"] for item in events]
    species_ids = [item["@id"] for item in species]

    for eid in event_ids:
        if eid not in chrono:
            problems.append(f"event {eid}: no chronology Markdown row with this id")
    for cid in sorted(chrono):
        if cid not in event_ids:
            problems.append(f"chronology id {cid}: no events.json entry")

    for sid in species_ids:
        if sid not in morpho:
            problems.append(f"species {sid}: no morphology catalogue-map row")
    for cid in sorted(morpho):
        if cid not in species_ids:
            problems.append(f"morphology id {cid}: no species.json entry")

    for item in events:
        eid = item["@id"]
        row = chrono.get(eid)
        if not row:
            continue
        dl = item.get("hominin:debateLevel")
        et = item.get("hominin:evidenceType")
        if dl not in DEBATE_VALUES:
            problems.append(f"event {eid}: invalid debateLevel {dl!r}")
        if et not in EVIDENCE_VALUES:
            problems.append(f"event {eid}: invalid evidenceType {et!r}")
        if dl != row["debate"]:
            problems.append(
                f"event {eid}: debateLevel JSON {dl!r} != Markdown {row['debate']!r}"
            )
        if et != row["evidence"]:
            problems.append(
                f"event {eid}: evidenceType JSON {et!r} != Markdown {row['evidence']!r}"
            )
        extra = json_event_dois(item) - row["dois"]
        if extra:
            problems.append(f"event {eid}: JSON DOI not in Markdown row: {sorted(extra)}")
        if dl == "UNASSESSED" and et != "UNASSESSED":
            problems.append(f"event {eid}: UNASSESSED debateLevel with assessed evidenceType")
        if et == "UNASSESSED" and dl != "UNASSESSED":
            problems.append(f"event {eid}: UNASSESSED evidenceType with assessed debateLevel")

    for item in species:
        sid = item["@id"]
        row = morpho.get(sid)
        if row is None:
            continue
        allowed = row["dois"]
        missing_notes = sorted(x for x in allowed if x.startswith("MISSING_FOOTNOTE:"))
        if missing_notes:
            problems.append(f"species {sid}: {', '.join(missing_notes)}")
        allowed_dois = {d for d in allowed if not d.startswith("MISSING_FOOTNOTE:")}
        extra = json_species_dois(item) - allowed_dois
        if extra:
            problems.append(
                f"species {sid}: JSON DOI not in mapped footnotes: {sorted(extra)}"
            )
        if not json_species_dois(item):
            problems.append(f"species {sid}: hominin:references has no DOI")
        for key in (
            "hominin:taxonomyDebateLevel",
            "hominin:behaviorDebateLevel",
            "hominin:pigmentationDebateLevel",
        ):
            if item.get(key) == "UNASSESSED":
                problems.append(f"species {sid}: UNASSESSED is forbidden on species ({key})")
        for md_col, json_key in SPECIES_TOKEN_COLS:
            md_val = row["tokens"].get(json_key, "")
            js_val = item.get(json_key)
            if not md_val:
                problems.append(f"species {sid}: Markdown missing {md_col}")
                continue
            valid = DEBATE_VALUES if json_key.endswith("DebateLevel") else EVIDENCE_VALUES
            if md_val not in valid:
                problems.append(f"species {sid}: invalid Markdown {md_col} {md_val!r}")
            if js_val not in valid:
                problems.append(f"species {sid}: invalid JSON {json_key} {js_val!r}")
            if md_val and js_val != md_val:
                problems.append(
                    f"species {sid}: {json_key} JSON {js_val!r} != Markdown {md_val!r}"
                )

    if not args.quiet:
        print(
            f"{len(event_ids)} events, {len(species_ids)} species; "
            f"{len(chrono)} chronology ids, {len(morpho)} morphology ids\n"
        )
    if problems:
        for line in problems:
            print(f"MISMATCH  {line}")
        print(f"\n{len(problems)} correspondence problem(s).")
        return 1
    if not args.quiet:
        print("OK  Markdown and JSON catalogue identifiers, DOIs, and tokens agree.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
