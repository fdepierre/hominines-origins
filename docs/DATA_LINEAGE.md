# Data lineage

How scientific knowledge travels through this repository, and which layer is
authoritative for what.

This document is derived from the verified audit in
[`docs/DATA_LINEAGE_AUDIT.md`](DATA_LINEAGE_AUDIT.md) (when present) and from the
repository code as of the safeguards implementation. It describes the **current**
lineage. It does not change scientific claims.

---

## Layers

| Layer | Location | Role |
|-------|----------|------|
| Editorial truth | `data/*.md` | Human-readable scientific reference documents (French). DOI-backed claims, debate wording, morphology, pigmentation notes. Edited by researchers and contributors. |
| Executable truth | `app/data/species.json`, `app/data/events.json` | Structured JSON-LD the application loads at runtime via `fetch`. Manually maintained; not generated from Markdown. |
| Derived embedded mirror | `_EMBEDDED_SPECIES` / `_EMBEDDED_EVENTS` inside `app/index.html` | Offline / `file://` fallback when `fetch` fails. **Never authoritative.** Regenerated from `app/data/*.json` only. |

```
primary literature (journals, DOI)
        │  manual
        ▼
data/*.md                 ← editorial source of truth
        │  manual mirror (no automated generator)
        ▼
app/data/*.json           ← executable source of truth
        │  scripts/sync_embedded.py  (one-way)
        ▼
app/index.html            ← derived embedded mirror
  (_EMBEDDED_SPECIES / _EMBEDDED_EVENTS)
```

### Editorial vs executable truth

- **`data/`** is the editorial source of truth: prose tables meant for humans,
  with DOI links and scientific uncertainty stated in words. No script, test, or
  CI job opens these files. Keeping them aligned with JSON is a human process.
- **`app/data/`** is the executable source of truth: what the running app and the
  non-regression tests actually consume. Counts and field values here win over
  documentation when they disagree.
- **`app/index.html` embedded blocks** are a **derived mirror** of `app/data/*.json`.
  Direction is strictly one-way: JSON → HTML. Manual edits to the embedded
  constants are overwritten on the next sync.

---

## Commands

```bash
# After editing app/data/species.json or app/data/events.json:
python scripts/sync_embedded.py

# Read-only: exit 0 if mirrors match, non-zero if they diverge (no file writes):
python scripts/sync_embedded.py --check

# Full non-regression suite (non-zero exit on failure):
node tests/run-all.js
# or equivalently for CI:
node tests/run-all.js --ci
```

CI runs `python3 scripts/sync_embedded.py --check` before the Playwright suite
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
   species IDs (21), event IDs (30), and certainty fields where present.
5. **Test runner exit status** — `node tests/run-all.js` exits non-zero on failure
   (local and CI).

---

## Future work (not implemented)

These were identified in the audit and are **out of scope** for the current
safeguards. Do not treat them as present.

| Item | Why deferred |
|------|----------------|
| Markdown → JSON generation | Would require a conversion pipeline that must never strengthen, simplify, infer, translate, or discard epistemic status. No such generator exists; building one is a separate design effort. |
| DOI / reference fields on `app/data/species.json` | Schema change. Species JSON currently has no citation key; DOIs live only in `data/*.md`. Adding `hominin:references` (or similar) needs an explicit data-model decision. |
| Full certainty coverage on all events | Only a minority of events currently carry `hominin:debateLevel` / `hominin:evidenceType`. Completing that is a scientific curation task, not a tooling task. |
| Automated Markdown↔JSON correspondence checks | Depends on stable identifiers spanning both formats and on the schema decisions above. |
| Document relocation (`data/fr/`, English root documents) | Migration planning only; must not start until editorial primary language and translation process are confirmed. |

---

## Non-negotiable rule

Conversion must never strengthen, simplify, infer, translate, or silently discard
the epistemic status of a scientific claim. It may change format only.
