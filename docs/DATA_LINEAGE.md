# Data lineage

How scientific knowledge travels through this repository, and which layer is
authoritative for what.

Living document. A pre-migration audit snapshot lives in
[`docs/DATA_LINEAGE_AUDIT.md`](DATA_LINEAGE_AUDIT.md) (historical only).

---

## Layers

| Layer | Location | Role |
|-------|----------|------|
| Editorial truth | `data/Hominins-Morphology-Pigmentation.md`, `data/Prehistoric-Chronology-Scientific-Reference.md` | English scientific reference syntheses (not literal translations). Stable filenames (no year stamp); update in place and bump **Last reviewed**. |
| Executable truth | `app/data/species.json`, `app/data/events.json` | Structured JSON-LD the application loads at runtime via `fetch`. Manually maintained; not generated from Markdown. |
| Derived embedded mirror | `_EMBEDDED_SPECIES` / `_EMBEDDED_EVENTS` inside `app/index.html` | Offline / `file://` fallback when `fetch` fails. **Never authoritative.** Regenerated from `app/data/*.json` only. |

```
primary literature (journals, DOI)
        │  manual
        ▼
data/*.md                 ← editorial source of truth (English references)
        │  manual mirror (no automated generator)
        ▼
app/data/*.json           ← executable source of truth
        │  scripts/sync_embedded.py  (one-way)
        ▼
app/index.html            ← derived embedded mirror
  (_EMBEDDED_SPECIES / _EMBEDDED_EVENTS)
```

### Editorial vs executable truth

- **`data/`** is the editorial source of truth: English scientific reference
  documents with DOI links, evidence types, and debate notes. No script, test, or
  CI job opens these files. Keeping them aligned with JSON is a human process
  (e.g. literature update → decide whether `app/data/` must change).
- **`app/data/`** is the executable source of truth: what the running app and the
  non-regression tests actually consume. Counts and field values here win over
  documentation when they disagree.
- **`app/index.html` embedded blocks** are a **derived mirror** of `app/data/*.json`.
  Direction is strictly one-way: JSON → HTML. Manual edits to the embedded
  constants are overwritten on the next sync.

Former French working tables were removed from the tree after the English
references became primary; they remain reachable only via git history if needed.

---

## Commands

```bash
# After editing app/data/species.json or app/data/events.json:
python scripts/sync_embedded.py

# Read-only: exit 0 if mirrors match, non-zero if they diverge (no file writes).
# Also prints the authoritative species and event counts:
python scripts/sync_embedded.py --check

# Read-only: verify every cited DOI resolves and matches its citing text:
python scripts/check_dois.py --quiet

# Full non-regression suite (non-zero exit on failure):
node tests/run-all.js
# or equivalently for CI:
node tests/run-all.js --ci
```

CI runs `python3 scripts/sync_embedded.py --check` and
`python3 scripts/check_dois.py --quiet` before the Playwright suite
(see `.github/workflows/test.yml`).

Embedded blocks are bounded by unique sentinels
(`BEGIN/END_EMBEDDED_SPECIES`, `BEGIN/END_EMBEDDED_EVENTS`) so the sync script
cannot truncate data when an ordinary banner comment is inserted.

---

## Safeguards in place

1. **`--check` mode** on `scripts/sync_embedded.py` — read-only JSON↔embedded comparison.
2. **CI gate** — the check runs in the non-regression workflow.
3. **Unique sentinels** around embedded blocks — structural anchors for sync/extract.
4. **Embedded-fallback test** — aborts `fetch` of the JSON files and asserts the same
   species IDs, event IDs, and certainty fields where present.
5. **Test runner exit status** — `node tests/run-all.js` exits non-zero on failure
   (local and CI).
6. **DOI verification** — `python scripts/check_dois.py` resolves every DOI cited in
   `data/`, `docs/` and `app/data/` against Crossref and fails when an identifier is
   dead or points at a paper whose first author does not appear in the citing text.
   An identifier inside an inline code span is treated as quoted, not cited, so the
   validation notes can discuss identifiers that were found to be wrong.

---

## Future work (not implemented)

| Item | Why deferred |
|------|----------------|
| Markdown → JSON generation | Would require a conversion pipeline that must never strengthen, simplify, infer, translate, or discard epistemic status. No such generator exists; building one is a separate design effort. |
| DOI / reference fields on `app/data/species.json` | Schema change. Species JSON currently has no citation key; DOIs live in the English `data/` references. |
| Full certainty coverage on all events | Only a minority of events currently carry `hominin:debateLevel` / `hominin:evidenceType`. Completing that is a scientific curation task, not a tooling task. |
| Automated Markdown↔JSON correspondence checks | Depends on stable identifiers spanning both formats and on the schema decisions above. |

---

## Non-negotiable rule

Conversion must never strengthen, simplify, infer, translate, or silently discard
the epistemic status of a scientific claim. It may change format only.
