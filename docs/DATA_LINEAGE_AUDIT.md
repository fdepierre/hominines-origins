# Scope

> **Historical snapshot (pre-migration).** This audit was written before English
> scientific references became the sole editorial primary and before the French
> working tables were removed from `data/`. Do **not** treat path inventories or
> migration plans below as current policy. For the living lineage, see
> [`docs/DATA_LINEAGE.md`](DATA_LINEAGE.md). French tables remain in git history
> only if someone needs to recover them.

Read-only audit of the data lineage of `hominines-origins`, performed before any
scientific-document migration. No repository file was modified by this audit
beyond writing this report.

**What this audit covers**

- The chain from primary literature → human-readable scientific documents (`data/*.md`)
  → structured JSON-LD (`app/data/*.json`) → embedded static application data
  (`_EMBEDDED_SPECIES` / `_EMBEDDED_EVENTS` in `app/index.html`).
- Every hard-coded reference to the two French reference documents, to
  `app/data/events.json`, to `app/data/species.json`, and to `app/index.html`.
- The blast radius of moving the French reference documents to `data/fr/` and
  promoting English documents to the root of `data/`.

**What this audit does not do**

- It does not change any scientific claim, date, taxon, pigmentation statement, DOI,
  confidence level, application behaviour, or visual content.
- It does not perform, stage, or prepare the migration.

**Evidence tiers used throughout**

| Tag | Meaning |
|-----|---------|
| **[VERIFIED]** | Directly read from repository code, data, or configuration. File and line cited. |
| **[INFERENCE]** | Plausible reading of the evidence, but not proven by the repository alone. |
| **[OPEN]** | Unresolved; requires maintainer confirmation before acting. |

**Non-negotiable rule carried into every recommendation below**

> Conversion must never strengthen, simplify, infer, translate, or silently discard
> the epistemic status of a scientific claim. It may change format only.

Where a proposed step in this report could violate that rule, the risk is called out
explicitly rather than being resolved by the auditor.

**Disclosure — one command executed during the audit.**
`python scripts/sync_embedded.py` was run once to determine whether the embedded
application data currently diverges from `app/data/*.json`. The script is
write-guarded (`app/index.html` is only written when the regenerated content differs)
and it printed `No change needed.`. `git status --porcelain` and `git diff --stat`
were empty before and after. No file was modified. **[VERIFIED]**

---

# Repository map

Tracked files, grouped by role. **[VERIFIED]** — from `git ls-files`.

## Layer 1 — Human-readable scientific documents (French, root of `data/`)

| File | Size |
|------|------|
| `data/Hominines-Tableau-morphologique-et-pigmentation-complet-2026.md` | 58 443 bytes |
| `data/Chronologie-prehistorique-Tableau-de-reference-scientifique-2026.md` | 48 483 bytes |

These are the only two files in `data/`. There is no `data/fr/`, no `data/en/`, and no
English counterpart anywhere in the repository. **[VERIFIED]**

## Layer 2 — Structured application data (JSON-LD)

| File | Root keys | `itemListElement` count |
|------|-----------|-------------------------|
| `app/data/species.json` | `@context`, `@type`, `name`, `description`, `itemListElement` | **21** |
| `app/data/events.json` | `@context`, `@type`, `name`, `description`, `itemListElement` | **30** |

## Layer 3 — Application

| File | Role |
|------|------|
| `app/index.html` | The entire application (inline HTML/CSS/JS). Contains `const _EMBEDDED_SPECIES` at line 5763 and `const _EMBEDDED_EVENTS` at line 9045 — full copies of Layer 2. |
| `index.html` (repo root) | Meta-refresh redirect to `app/index.html`. |
| `CNAME` | `ho.lookingforanswers.eu` |

## Scripts

| File | Reads | Writes |
|------|-------|--------|
| `scripts/sync_embedded.py` | `app/data/species.json`, `app/data/events.json`, `app/index.html` | `app/index.html` |
| `scripts/translate_species.py` | `app/data/species.json` | `app/data/species.json` (in place) |
| `scripts/rename_certainty_enums.py` | 6 files (see below) | the same 6 files (in place) |

## Tests

| File | Cases (`await test(` occurrences) |
|------|-----------------------------------|
| `tests/unit.test.js` | 29 |
| `tests/a11y.test.js` | 31 |
| `tests/visual.test.js` | 9 |
| `tests/maplibre.test.js` | 8 |
| `tests/run-all.js` | runner (4 suites) |
| `tests/run-smoke.js` | fast runner |
| `tests/utils/harness.js` | shared Playwright + static HTTP server |
| `tests/snapshots/*.png` | 8 reference PNGs |

## Documentation and governance

`README.md`, `CONTRIBUTING.md`, `LICENSE`, `docs/ROADMAP.md`,
`docs/scientific-references.md`, `.ai-context/CONTEXT.md`,
`.ai-context/data-schema.md`, `.github/ISSUE_TEMPLATE/data-update.md`,
`.github/ISSUE_TEMPLATE/translation.md`, `.github/workflows/test.yml`,
`.github/workflows/static.yml`, `package.json`, `package-lock.json`.

---

# Current data flow

## The documented flow

`README.md` lines 59–63 and `.ai-context/CONTEXT.md` lines 113–124 both describe:

```
data/*.md          ←  humans edit this (researchers, contributors)
    ↓ derive
app/data/*.json    ←  app reads this (machine-readable)
```

## The actual, verified flow

```
  primary literature (journals, DOI)
        │  manual, human, unaudited
        ▼
  data/*.md  (2 French documents)
        │
        │  ✗ NO automated link. No script opens these files.
        │    The arrow is human discipline only.
        ▼
  app/data/species.json   app/data/events.json
        │
        │  ✓ scripts/sync_embedded.py  (one-way, automated)
        ▼
  app/index.html : _EMBEDDED_SPECIES / _EMBEDDED_EVENTS
        │
        ▼
  runtime: loadData() prefers fetch('./data/*.json'),
           falls back to the embedded copies
```

## Are the Markdown files in `data/` parsed by scripts?

**No. [VERIFIED]** A repository-wide search for the two filenames returns only prose
mentions, never a file-system operation:

- `scripts/translate_species.py:14` — the filename appears inside the module
  docstring, explaining where the English translation vocabulary came from. The script
  never opens it; its only path constants are `ROOT` and `SPECIES_PATH`
  (`scripts/translate_species.py:22-24`).
- `README.md:45-46`, `.ai-context/CONTEXT.md:27,29,166,170`,
  `.ai-context/data-schema.md:172,179` — documentation links and checklists.
- `data/Hominines-...-2026.md:284` — the Markdown document itself contains a section
  titled `### Recommandation pour \`app/data/species.json\`` giving explicit
  recommended enum values (`ACTIVE_DEBATE`, `INDIRECT_DATA`,
  `SPECULATIVE_HYPOTHESIS`, `EVOLUTIONARY_INFERENCE`). Nothing reads or enforces it.

No script, test, or workflow performs any read of `data/*.md`.

**[INFERENCE]** The Markdown documents are therefore *editorially* the source of truth
but *mechanically* inert. The `↓ derive` arrow in the README is entirely manual.

## Are `app/data/*.json` manually maintained or generated?

**Manually maintained. [VERIFIED]** No generator exists. There is no script that
produces `species.json` or `events.json` from any upstream source.

Two scripts *mutate* them in place, and both are transformations of existing JSON
rather than derivations from the Markdown:

- `scripts/translate_species.py` rewrites `app/data/species.json` so that French text
  fields become `{fr, en}` pairs. Translations come from hard-coded dictionaries in the
  script itself (`DIMORPHISM`, `BIOMETRIC_NUMERIC`, `PIGM_CERT_LABEL`, `TOOLS`,
  `DEBATE`, `REGION_NAMES`, `REGION_NOTES`, `SITE_NAMES`, `SITE_NOTES`,
  `MIGRATION_LABELS`). Unknown strings raise `KeyError` via `tr_or_die` and the script
  exits with status 1 (`scripts/translate_species.py:398-401, 500-504`).
- `scripts/rename_certainty_enums.py` is a one-off string replacer that rewrites
  French enum tokens to English across six files
  (`scripts/rename_certainty_enums.py:48-55`): `app/data/species.json`,
  `app/data/events.json`, `tests/unit.test.js`, `README.md`,
  `.ai-context/data-schema.md`, `app/index.html`.

**Notable, and good:** `translate_species.py` refuses to guess. Its `tr_or_die` hard-fail
is a working precedent for the non-negotiable rule — an unmapped scientific string
stops the pipeline instead of being silently machine-translated. **[VERIFIED]**

## Does `app/index.html` embed data copied from `app/data/*.json`?

**Yes. [VERIFIED]**

- `const _EMBEDDED_SPECIES = {` at `app/index.html:5763`
- `const _EMBEDDED_EVENTS = {` at `app/index.html:9045`
- The comment at `app/index.html:5761` states: *"Keep `_EMBEDDED_SPECIES` /
  `_EMBEDDED_EVENTS` in sync with `app/data/species.json` and `events.json` when you
  change the files."*

Runtime selection logic, `app/index.html:9847-9870`:

```9847:9870:app/index.html
async function loadData() {
  let sj, ej;
  try {
    const cacheBust = '?v=catalogue-21-20260828';
    const [sr, er] = await Promise.all([
      fetch('./data/species.json' + cacheBust),
      fetch('./data/events.json' + cacheBust),
    ]);
    if (!sr.ok) throw new Error('species.json HTTP ' + sr.status);
    if (!er.ok) throw new Error('events.json HTTP '  + er.status);
    sj = await sr.json();
    ej = await ej_json(er);
  } catch(err) {
    console.warn('[Hominines] fetch failed, using embedded data:', err.message);
    sj = _EMBEDDED_SPECIES;
    ej = _EMBEDDED_EVENTS;
  }
  window._RAW_SPECIES_JSON = sj;
  window._RAW_EVENTS_JSON  = ej;
  SPECIES_DATA = sj.itemListElement.map(adaptSpecies);
  EVENTS_DATA  = ej.itemListElement.map(adaptEvent);
  window.__HOMININ_CERTAINTY_READY = true;
  bootApp();
}
```

The fetch paths are **relative to `app/index.html`**, so `./data/species.json`
resolves to `app/data/species.json`, not to the repository-root `data/`. **[VERIFIED]**
The root `data/` directory is never referenced by the application at runtime.

The cache-busting token `?v=catalogue-21-20260828` is hard-coded and must be bumped by
hand when the JSON changes, or returning browsers may serve a stale cached catalogue.
**[VERIFIED]** that it is hard-coded; **[OPEN]** whether bumping it is part of the
maintainer's release routine, since nothing in the repository enforces or documents it.

## Is `sync_embedded.py` one-way, and in which direction?

**Yes, strictly one-way. [VERIFIED]**

**Direction: `app/data/species.json` + `app/data/events.json` → `app/index.html`.**

Never the reverse. The full script (33 lines) reads both JSON files and the HTML,
regenerates the two `const` blocks with `json.dumps(value, ensure_ascii=False, indent=2)`,
and writes only `app/index.html`:

```10:28:scripts/sync_embedded.py
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
```

Consequences worth recording:

- The JSON files are unambiguously authoritative over the embedded blobs. Any manual
  edit to `_EMBEDDED_SPECIES` / `_EMBEDDED_EVENTS` is destroyed on the next run, with
  no warning and no backup. **[VERIFIED]**
- The script has **no `--check` / `--dry-run` mode**. Detecting divergence requires
  running the mutating script and inspecting the exit state or the working tree.
  **[VERIFIED]**
- The second anchor is the literal string
  `"\n\n// ====================================================================="`.
  The first such banner after `_EMBEDDED_EVENTS` is the `DATA LOADING` header at
  `app/index.html:9844`. There are 58 banner lines in the file, so the anchor is
  positionally correct today but structurally fragile: inserting a banner comment
  between the two constants would silently truncate the embedded events block.
  **[VERIFIED]** that the anchor is a bare string match; **[INFERENCE]** on the
  fragility consequence.
- The script does not bump the `?v=` cache-busting token. **[VERIFIED]**

**Current state: the embedded copies are in sync with `app/data/*.json`.** **[VERIFIED]**
— `python scripts/sync_embedded.py` printed `No change needed.` and left the tree clean.

---

# Source-of-truth assessment

## By layer

| Layer | Declared source of truth | Actual, enforced source of truth |
|-------|--------------------------|----------------------------------|
| Scientific claim, DOI, epistemic status | `data/*.md` — `CONTRIBUTING.md:19` states *"These Markdown tables are the single source of truth"* | Nothing enforces it. `data/*.md` is not read by any code. **[VERIFIED]** |
| Structured catalogue | `app/data/*.json` | `app/data/*.json` — authoritative for both the running app and the embedded mirrors. **[VERIFIED]** |
| Offline / `file://` catalogue | `_EMBEDDED_*` in `app/index.html` | Derived, never authoritative. Regenerated by `sync_embedded.py`. **[VERIFIED]** |

**Conclusion. [VERIFIED]** There are two source-of-truth regimes, and they do not meet:

1. **Editorial truth** lives in `data/*.md` and is maintained by human discipline alone.
2. **Executable truth** lives in `app/data/*.json` and is mechanically propagated
   forward by exactly one script.

The join between them — the step where a DOI-backed, uncertainty-qualified claim in
French prose becomes a structured field — is the only step in the whole chain with **no
automation, no test, and no reviewable artefact.** It is also the step where the
non-negotiable rule is most easily violated, because it is the only step performed by a
human or an assistant reading prose and typing an enum.

## The DOI lineage is severed at the JSON layer

This is the most consequential finding of the audit.

**`app/data/species.json` contains no DOI, citation, or reference field at all.**
**[VERIFIED]** — the complete key inventory across all 21 species is:

`@id`, `@type`, `name`, `taxon:scientificName`, `hominin:periodStart`,
`hominin:periodEnd`, `hominin:color`, `hominin:lane`, `hominin:regions`,
`hominin:fossilSites`, `hominin:migrations`, `hominin:tools`, `hominin:debate`,
`hominin:heightM`, `hominin:heightF`, `hominin:weightM`, `hominin:brain`,
`hominin:dimorphism`, `hominin:skinDesc`, `hominin:skinColor`, `hominin:skinVariant`,
`hominin:skinVariantColor`, `hominin:skinSpectrumColors`, `hominin:eyesDesc`,
`hominin:eyesColor`, `hominin:eyesVariant`, `hominin:eyesVariantColor`,
`hominin:hairDesc`, `hominin:hairColor`, `hominin:hairVariant`,
`hominin:hairVariantColor`, `hominin:pigmentationCertainty`,
`hominin:pigmentationCertLabel`, `hominin:taxonomyDebateLevel`,
`hominin:taxonomyEvidenceType`, `hominin:behaviorDebateLevel`,
`hominin:behaviorEvidenceType`, `hominin:pigmentationDebateLevel`,
`hominin:pigmentationEvidenceType`.

Number of species carrying any reference-like key: **0 of 21**.

So `CONTRIBUTING.md:9` — *"Every factual claim must be backed by a peer-reviewed source
with a DOI"* — is satisfied in `data/*.md` (which is dense with DOI links) and is
structurally unsatisfiable in `app/data/species.json`. The species DOIs exist only in
the French Markdown. **[VERIFIED]**

**Implication for the migration. [INFERENCE]** If the French documents cease to be the
root documents, the only surviving DOI provenance for every species claim moves into a
subdirectory that no code, test, or CI job touches. That does not by itself lose data,
but it removes the last convention marking those files as primary.

## The events layer carries epistemic status for 2 of 30 milestones

**[VERIFIED]** — key inventory for `app/data/events.json`:

| Field | Coverage |
|-------|----------|
| `hominin:dateReference` | 28 / 30 present. Missing on `art-altamira`, `art-lascaux`. |
| `hominin:dateReference` containing a DOI (`10.` prefix) | **3 / 30** — `ledi-geraru`, `yunxian-longi`, `thomas-quarry` |
| `hominin:debateLevel` | **2 / 30** — one `STRONG_CONSENSUS`, one `ACTIVE_DEBATE` |
| `hominin:evidenceType` | **2 / 30** — one `DIRECT_DATA`, one `INDIRECT_DATA` |

The 28 remaining `dateReference` values are bare journal citations without a resolvable
identifier, e.g. `'Nature 521:310 (2015)'`, `'Nature 260:293 (1976)'`.

**[INFERENCE]** The events layer looks like a partially-migrated schema: two milestones
(both from the August 2026 audit commits) received the certainty fields, and the other
28 predate that convention. **[OPEN]** Is full certainty-field coverage on events an
intended goal, or is the events layer deliberately scoped to dates and locations only?

Note the asymmetry this creates for the migration. `data/Chronologie-...-2026.md` carries
a `Débat` column and a `DOI` column for every row. `app/data/events.json` can represent
neither for 28 of 30 milestones. **Any format conversion that flows through the JSON
layer therefore already discards epistemic status by construction** — not through a bug,
but because the target schema has no slot for it. This is precisely the failure mode the
non-negotiable rule forbids, and it exists *today*, independent of any migration.
**[VERIFIED]** on the field counts; **[INFERENCE]** on the characterisation.

## Documented counts have already drifted from the data

**[VERIFIED]** — every count below was read directly from the files.

| Claim | Stated in | Actual |
|-------|-----------|--------|
| species.json holds 18 species | `README.md:54`, `.ai-context/CONTEXT.md:24`, `CONTEXT.md:70` | **21** |
| species.json holds 14 species | `.ai-context/data-schema.md:35` | **21** |
| events.json holds 27 milestones | `README.md:55`, `.ai-context/CONTEXT.md:25` | **30** |
| events.json holds 22 events | `README.md:46`, `.ai-context/CONTEXT.md:71`, `data-schema.md:111` | **30** |
| 58 tests | `README.md:8`, `README.md:151` | ~77 `await test(` cases across 4 suites |
| Suites: Unit 23 / Visual 9 / A11y 24 | `README.md:158-162` | 29 / 9 / 31, plus an unlisted MapLibre suite of 8 |
| Markdown doc covers 12 species | `README.md:45`, `.ai-context/CONTEXT.md:28` | **[OPEN]** — not recounted in this audit |

`tests/unit.test.js:33-36` is the only place that asserts a count, and it is current
(`SPECIES_DATA.length === 21`). Events are only checked as `>= 15`
(`tests/unit.test.js:161-164`), so the events count can drift in either direction
without failing.

**[INFERENCE]** This drift is itself the strongest available evidence for the audit's
central concern: in this repository, facts stated in prose documentation reliably fall
out of step with the data, because nothing checks them. The same mechanism will apply
to a French↔English document pair unless a check is added.

---

# Hard-coded path inventory

Every occurrence below was located by repository-wide search and confirmed by reading
the file. **[VERIFIED]** throughout. `package-lock.json` excluded.

## A. The two French reference documents in `data/`

**No script, test, or CI workflow opens either file.** Every reference is prose or a
documentation link.

| Location | Kind | Text / effect |
|----------|------|---------------|
| `README.md:45` | Markdown relative link | `[...](data/Hominines-Tableau-morphologique-et-pigmentation-complet-2026.md)` — **breaks on move** |
| `README.md:46` | Markdown relative link | `[...](data/Chronologie-prehistorique-Tableau-de-reference-scientifique-2026.md)` — **breaks on move** |
| `README.md:60` | Prose / diagram | `data/*.md ← humans edit this` |
| `README.md:66` | Prose | "Update the relevant `.md` file in `data/`" |
| `README.md:171` | Prose | "Researchers: update `data/` with new findings and a DOI" |
| `README.md:214` | Prose (licence) | "**Scientific data** (`data/`): CC BY 4.0" |
| `.ai-context/CONTEXT.md:27` | ASCII tree | filename listed under `data/` |
| `.ai-context/CONTEXT.md:29` | ASCII tree | filename listed under `data/` |
| `.ai-context/CONTEXT.md:117` | Prose | "Update the relevant Markdown file in `data/`" |
| `.ai-context/CONTEXT.md:166` | Assistant task template | names the morphology file as the mirror target |
| `.ai-context/CONTEXT.md:170` | Assistant task template | names the chronology file as the mirror target |
| `.ai-context/data-schema.md:172` | Checklist item | "Add or extend the row(s) in `data/Hominines-...-2026.md` with DOI" |
| `.ai-context/data-schema.md:179` | Checklist item | "Add the milestone to `data/Chronologie-...-2026.md` with DOI" |
| `scripts/translate_species.py:14` | Docstring only | cites the morphology file as the origin of the EN vocabulary; **no file access** |
| `CONTRIBUTING.md:19` | Prose | "The data lives in `data/`. These Markdown tables are the single source of truth." |
| `LICENSE:25` | Licence text | "Scientific data in data/ is licensed under CC BY 4.0" |
| `docs/scientific-references.md:4` | Prose | "All claims in `data/` should link back to one or more of these." |
| `data/Hominines-...-2026.md:284` | Reverse reference | the document names `app/data/species.json` and recommends enum values for it |

**Filename-level coupling: zero.** Link-level coupling: two Markdown links in `README.md`.

## B. `app/data/events.json`

| Location | Kind | Effect if the path changes |
|----------|------|---------------------------|
| `scripts/sync_embedded.py:7` | `EVENTS_JSON = ROOT / "app" / "data" / "events.json"` | **Script fails** (`FileNotFoundError`) |
| `scripts/rename_certainty_enums.py:50` | `"app/data/events.json"` in `FILES` | **Script fails** |
| `app/index.html:9853` | `fetch('./data/events.json' + cacheBust)` | **Runtime falls back to embedded data, silently** — `loadData` catches and warns to console only |
| `app/index.html:9856` | error string `'events.json HTTP '` | cosmetic |
| `app/index.html:5557` | comment | documentation drift |
| `README.md:46,55,67,192` | prose + Markdown links | broken links |
| `.ai-context/CONTEXT.md:25,59,118,170` | tree, prose, links, task template | documentation drift |
| `.ai-context/data-schema.md:103,180` | headings and checklist | documentation drift |
| `docs/ROADMAP.md:10` | Markdown link | broken link |

## C. `app/data/species.json`

| Location | Kind | Effect if the path changes |
|----------|------|---------------------------|
| `scripts/sync_embedded.py:6` | `SPECIES_JSON = ROOT / "app" / "data" / "species.json"` | **Script fails** |
| `scripts/translate_species.py:23-24` | `SPECIES_PATH`, `OUT_PATH = SPECIES_PATH` | **Script fails** |
| `scripts/rename_certainty_enums.py:49` | `"app/data/species.json"` in `FILES` | **Script fails** |
| `app/index.html:9852` | `fetch('./data/species.json' + cacheBust)` | **Silent fallback to embedded data** |
| `app/index.html:9855` | error string | cosmetic |
| `app/index.html:2536,2539` | comments | documentation drift |
| `tests/utils/harness.js:28` | `@deprecated` comment citing `./data/species.json` | cosmetic |
| `tests/utils/harness.js:156` | comment | cosmetic |
| `tests/unit.test.js:108` | test **name** string only | cosmetic; the test asserts on the browser runtime, not the file |
| `README.md:54,67,108,186,192` | prose + links | broken links |
| `.ai-context/CONTEXT.md:24,59,118,166` | tree, prose, links, task template | documentation drift |
| `.ai-context/data-schema.md:3,9,62,90,173` | headings, table, links | documentation drift |
| `docs/ROADMAP.md:9` | Markdown link | broken link |

## D. `app/index.html`

| Location | Kind | Effect if the path changes |
|----------|------|---------------------------|
| `scripts/sync_embedded.py:8` | `INDEX_HTML = ROOT / "app" / "index.html"` | **Script fails** |
| `scripts/rename_certainty_enums.py:54,69` | in `FILES`, plus a special-case branch applying `CSS_PAIRS` | **Script fails** |
| `tests/utils/harness.js:26-27` | `APP_DIR`, `APP_PATH` | **All 4 suites fail** |
| `tests/utils/harness.js:40` | server maps `/` → `/index.html` | **All suites fail** |
| `tests/utils/harness.js:148` | `const url = \`${base}/index.html\`` | **All suites fail** |
| `tests/maplibre.test.js:16,93` | `page.goto(\`${base}/index.html\`)` | **MapLibre suite fails** |
| `.github/workflows/static.yml:40` | `path: './app'` | **Deployment publishes the wrong tree** |
| `index.html:6,7,10` (repo root) | meta-refresh, canonical, anchor to `app/index.html` | broken redirect |
| `app/index.html:2348-2349` | `hreflang` alternates → `./index.html` | self-referential; SEO only |
| `README.md:135,137,172` · `CONTRIBUTING.md:24,31,37,52` · `.ai-context/CONTEXT.md:22,53,148` · `.ai-context/data-schema.md:3,142,174,181` · `docs/ROADMAP.md:12` · `.github/ISSUE_TEMPLATE/translation.md:29` | prose and links | documentation drift |

## Summary of coupling strength

| Target | Hard code coupling | Test coupling | CI coupling | Doc-link coupling |
|--------|-------------------|---------------|-------------|-------------------|
| `data/*.md` (French docs) | **none** | **none** | **none** | 2 links in `README.md` |
| `app/data/events.json` | 3 scripts + 1 fetch | none (runtime only) | none | several |
| `app/data/species.json` | 3 scripts + 1 fetch | none (runtime only) | none | several |
| `app/index.html` | 2 scripts | **4 suites** | **`static.yml`** | several |

---

# Reproducible commands

All commands assume the repository root. Verified against `package.json:5-17`,
`.github/workflows/test.yml`, and the scripts themselves. **[VERIFIED]** unless marked.

## Update application data

There is **no generator command**. Updating application data is a manual edit of
`app/data/species.json` and/or `app/data/events.json`. **[VERIFIED]** — no script in
the repository produces these files.

Optional transforms, both of which rewrite their input in place:

```bash
# Rewrite app/data/species.json so FR text fields become {fr, en}.
# Hard-fails with exit 1 on any string missing from the script's dictionaries.
python scripts/translate_species.py

# One-off: rename FR certainty enum tokens to EN across 6 files
# (species.json, events.json, unit.test.js, README.md, data-schema.md, index.html).
python scripts/rename_certainty_enums.py
```

Manual step with no command: bump `?v=catalogue-21-20260828` at `app/index.html:9850`
so returning browsers do not serve a cached catalogue. **[VERIFIED]** that the token is
hard-coded; **[OPEN]** whether bumping it is expected practice.

## Synchronise embedded data

```bash
python scripts/sync_embedded.py
```

Direction: `app/data/species.json` + `app/data/events.json` → `app/index.html`.
Prints `No change needed.` when already in sync, otherwise
`OK — embedded JSON resynced (N species, M events).` and writes the file.
**Requires Python 3; no dependencies beyond the standard library.**

## Run tests

```bash
npx playwright install chromium   # once, or: npm run setup
node tests/run-all.js             # full suite, or: npm test
node tests/run-all.js --ci        # exit code 1 on failure — this is what CI runs
npm run test:smoke                # fast: no PNG snapshots, no tablet pass
npm run test:unit                 # data integrity, timeline maths, bearings
npm run test:visual
npm run test:a11y
npm run test:maplibre
UPDATE_SNAPSHOTS=1 node tests/visual.test.js   # only when layout changed on purpose
```

**Important behavioural detail. [VERIFIED]** — `tests/run-all.js:83` is
`process.exit(CI ? 1 : 0)`. Without `--ci`, a failing local run **still exits 0**. Only
`node tests/run-all.js --ci` fails the build. `.github/workflows/test.yml:31` correctly
uses `--ci`; `package.json`'s default `npm test` does not.

## Check whether JSON and embedded data diverge

**No read-only check exists.** `scripts/sync_embedded.py` has no `--check` or
`--dry-run` flag, and no CI job runs it. **[VERIFIED]**

The only available check today is to run the mutating script on a clean tree and inspect
the result:

```bash
git status --porcelain            # must be empty first
python scripts/sync_embedded.py   # prints "No change needed." if in sync
git diff --exit-code -- app/index.html   # exit 0 = was already in sync
```

If the tree is not clean, the check is not trustworthy, because a pre-existing
modification to `app/index.html` is indistinguishable from one the script just made.

**Result of running this check during the audit: in sync.** `No change needed.`, empty
diff. **[VERIFIED]**

## Checks that do not exist

| Desired check | Status |
|---------------|--------|
| `data/*.md` ↔ `app/data/*.json` correspondence | **none** |
| JSON ↔ embedded divergence, read-only | **none** |
| JSON-LD schema validation | **none** |
| DOI presence or format validation | **none** |
| Documented counts ↔ actual counts | **none** |

---

# Migration risks

Assessed scenario: move
`data/Hominines-Tableau-morphologique-et-pigmentation-complet-2026.md` and
`data/Chronologie-prehistorique-Tableau-de-reference-scientifique-2026.md` into
`data/fr/`, and place English documents at the root of `data/`.

## Mechanical breakage

| Component | Breaks? | Evidence |
|-----------|---------|----------|
| `scripts/sync_embedded.py` | **No** | Touches only `app/**`. **[VERIFIED]** |
| `scripts/translate_species.py` | **No** | Only `app/data/species.json`; the Markdown filename appears in a docstring at line 14 and is never opened. **[VERIFIED]** |
| `scripts/rename_certainty_enums.py` | **No** | `FILES` at lines 48-55 contains no `data/*.md` entry. **[VERIFIED]** |
| `tests/unit.test.js` | **No** | Asserts on browser-runtime `SPECIES_DATA` / `EVENTS_DATA`. No filesystem access to `data/`. **[VERIFIED]** |
| `tests/visual.test.js`, `a11y.test.js`, `maplibre.test.js` | **No** | Same; all route through `tests/utils/harness.js`, which serves `app/` only. **[VERIFIED]** |
| `.github/workflows/test.yml` | **No** | Runs `node tests/run-all.js --ci` only. **[VERIFIED]** |
| `.github/workflows/static.yml` | **No** | `path: './app'` at line 40 — the root `data/` directory is **not deployed at all**. **[VERIFIED]** |
| The running application | **No** | `fetch('./data/species.json')` resolves relative to `app/index.html` → `app/data/`. Root `data/` is never fetched. **[VERIFIED]** |
| `README.md` links | **Yes — 2 broken links** | `README.md:45` and `README.md:46` are relative links into `data/`. **[VERIFIED]** |
| `docs/ROADMAP.md` | No | Its links point at `app/data/*`, unaffected. **[VERIFIED]** |
| `.ai-context/CONTEXT.md` | Not broken, but wrong | Lines 27, 29 (tree) and 166, 170 (assistant task templates) name the old paths as plain text. **[VERIFIED]** |
| `.ai-context/data-schema.md` | Not broken, but wrong | Checklist lines 172 and 179 name the old paths. **[VERIFIED]** |
| `LICENSE:25`, `docs/scientific-references.md:4`, `CONTRIBUTING.md:19` | No | Refer to `data/` as a directory; subdirectories are still inside it. **[INFERENCE]** |

**Mechanical verdict. [VERIFIED]** The move is close to free at the code level. The only
hard breakage is two relative Markdown links in `README.md`. Nothing executable depends
on the location or the names of the French documents.

## Non-mechanical risks — these are the real ones

**Risk 1 — Promoting English to root inverts the lineage. [OPEN]**
`CONTRIBUTING.md:19` designates `data/` as *"the single source of truth"*. Today that
means the French documents. After the move, an English document sits where the source of
truth is documented to be, while the French document — the one that actually carries the
verified DOIs, the `Débat` columns, and the August 2026 audit annotations — sits one
level down. Unless the English document is itself independently sourced from the primary
literature, the repository will assert that a derived translation is primary.

This is a governance decision about provenance, not a file move. It requires explicit
maintainer confirmation.

**Risk 2 — "English root documents" implies translating scientific prose. [VERIFIED risk, [OPEN] intent]**
The French documents are not tables of numbers. They contain hedged scientific prose
whose exact wording *is* the epistemic status. Examples read directly from
`data/Chronologie-...-2026.md`:

- Line 60: *"Statut recommandé : datation `STRONG_CONSENSUS`, interprétation
  phylogénétique `MODERATE_CONSENSUS`"* — a two-part status where translation must not
  collapse the split.
- Line 35 (`Little Foot`): *"Très débattu"*, with the debate cell naming *"deux fronts
  distincts : le taxon (Clarke & Kuman vs Martin et al.) et la datation (nucléides
  cosmogéniques vs biochronologie)"* — two independent axes of dispute in one cell.
- Line 53 (`H. floresiensis`): *"les hypothèses pathologiques … ont été largement
  réfutées morphométriquement mais restent encore relayées dans certains médias"* —
  a refuted-but-still-circulating claim. Dropping either clause changes the science.
- `data/Hominines-...-2026.md:282`: an explicit *"Notion fausse à signaler"* section
  correcting a media narrative about *Homo juluensis*.

Rendering *"Modéré — la coexistence stratigraphique est solide ; l'espèce
d'*Australopithecus* n'est pas encore nommée formellement"* as, say, "Debated" would
strengthen and simplify in a single stroke. Under the non-negotiable rule, that is a
prohibited transformation, and it is the default outcome of ordinary translation.

**Mitigating precedent. [VERIFIED]** The project already has the right pattern:
`scripts/translate_species.py` uses exhaustive explicit dictionaries and `tr_or_die`,
which raises `KeyError` and exits 1 rather than guessing
(`scripts/translate_species.py:398-401`). Its `DEBATE` dictionary (lines 178-207) shows
long debate sentences translated as whole, hand-checked units. That approach is
extensible to the Markdown documents; free-form or model-generated translation is not.

**Risk 3 — Contributor routing silently changes. [INFERENCE]**
`README.md:171` tells researchers to "update `data/`". Post-move, the obvious file in
`data/` is English. A francophone contributor adding a French-sourced finding would
naturally edit the English root document, and the French document in `data/fr/` would
begin to drift. Nothing in the repository would detect this. Given that the count drift
documented above already happened under a simpler structure, this is a realistic
outcome, not a hypothetical one.

**Risk 4 — Assistant task templates will point at stale paths. [VERIFIED]**
`.ai-context/CONTEXT.md:166` and `:170` are literal instructions handed to coding
assistants, naming the current file paths. If not updated in the same change, assistants
will create or edit files at the old paths, reintroducing root-level French documents by
accident.

**Risk 5 — Rename history. [INFERENCE]**
`git` detects renames by content similarity. Performing the move as a pure `git mv` in a
dedicated commit, with no content edits, preserves `git log --follow` and blame across
the move. Combining the move with content changes in one commit risks the rename being
recorded as delete + add, which would obscure the provenance of DOI-bearing lines —
directly contrary to the project's traceability goal.

**Risk 6 — A pre-existing violation will be inherited, not introduced. [VERIFIED]**
As established above, `app/data/events.json` can express a DOI for 3 of 30 milestones
and a certainty level for 2 of 30, while the chronology Markdown carries both for every
row. The Markdown → JSON step therefore already discards epistemic status. Restructuring
the document layer does not cause this, but it is the natural moment to record it, and
fixing it should not be silently folded into a migration commit.

---

# Safe migration plan

Ordered, reversible, one concern per step. **Nothing below has been executed.** Steps 0,
1, and 2 are prerequisites; the file move should not begin until they are done.

**Step 0 — Resolve the two blocking questions with the maintainer.**
Confirm (a) that English documents are genuinely intended to become the *primary*
documents rather than published translations, and (b) how the English documents will be
produced. If they are to be translations, agree in advance that the epistemic wording
will be transferred as reviewed whole units, in the style of `translate_species.py`'s
`DEBATE` dictionary, and never machine-translated in bulk. No file moves before this.

**Step 1 — Establish the baseline, on a clean tree.**
Record `git status --porcelain` as empty; run `python scripts/sync_embedded.py` and
confirm `No change needed.`; run `node tests/run-all.js --ci` and record the result.
Without a green, in-sync baseline, no later failure can be attributed.

**Step 2 — Add drift protection before restructuring anything.**
Land the checks from the next section — at minimum a read-only
JSON-vs-embedded comparison wired into `.github/workflows/test.yml`. Adding safety nets
after a restructuring cannot detect what the restructuring broke.

**Step 3 — Move the French documents, and only that.**
`git mv` both files into `data/fr/`. No content edits, no new files, no README edits in
this commit. Verify the commit shows two pure renames (`git show --stat -M`). Run
`node tests/run-all.js --ci` — it must still pass, because nothing executable references
these paths.

**Step 4 — Repair references, in a separate commit.**
Update the two broken links (`README.md:45-46`) and the stale textual references:
`.ai-context/CONTEXT.md:27,29,117,166,170`, `.ai-context/data-schema.md:172,179`,
`CONTRIBUTING.md:19`, `README.md:60,66,171`. Change paths only; do not reword any
scientific statement.

**Step 5 — Introduce the English documents as clearly derived.**
Add them at `data/` root in their own commit, each carrying a header that states the
source document, its commit hash, and the date of the correspondence check. Do not yet
change any wording that designates the source of truth.

**Step 6 — Verify epistemic equivalence, claim by claim, before promoting.**
Confirm for every row that debate wording, hedges, dual-axis statuses, DOI values,
dates, taxa, and pigmentation statements are preserved with no strengthening, no
simplification, and no dropped clause. Pay specific attention to the cases named in Risk
2. This is a reviewer task and is the gate for Step 7.

**Step 7 — Only after Step 6 passes: reassign the source-of-truth designation.**
Update `CONTRIBUTING.md:19`, `README.md`, and `.ai-context/CONTEXT.md` to state which
document is primary and which is derived, and how the two are kept in correspondence.
If Step 6 does not pass cleanly, stop here and keep French as primary — the English
documents remain useful as published translations.

**Step 8 — Add a correspondence check between the FR and EN documents.**
At minimum: same section headings, same row counts per table, identical DOI sets.
Without this, the pair will drift exactly as the counts in the docs already have.

**Step 9 — Re-run everything and record the result.**
`node tests/run-all.js --ci`, the sync check, and a manual load of the app over HTTP.

**Rollback.** Steps 3 through 5 are individually revertable. Because no executable
artefact depends on the French document paths, `git revert` of the rename commit
restores the previous state completely.

---

# Missing validations and tests

Ordered by the severity of the drift each one would prevent, along the chain
**primary sources → human-readable documents → structured JSON → embedded application data**.

## Link 3→4 — JSON to embedded data

**M1. No divergence check exists between `app/data/*.json` and `_EMBEDDED_*`.**
**[VERIFIED]** `sync_embedded.py` has no `--check` mode and no CI job runs it. The
mirrors are kept in step by manual discipline, and `README.md:68` explicitly makes it
optional ("If you care about offline or `file://` use…").
*Needed:* a `--check` flag returning exit 1 on divergence, invoked from
`.github/workflows/test.yml`. This is the single highest-value missing safeguard: it is
cheap, it is deterministic, and the failure it prevents is a user silently seeing a stale
catalogue.

**M2. The embedded fallback path is never exercised by any test.**
**[VERIFIED]** `tests/utils/harness.js:34-76` always serves `app/` over HTTP, so
`loadData()` always succeeds via `fetch` and `_EMBEDDED_*` is never read. All ~77 checks
would pass with arbitrarily stale or corrupt embedded blobs.
*Needed:* one test that blocks the two `fetch` calls (Playwright route interception),
loads the app, and asserts that the embedded path yields the same species count, the
same `@id` set, and the same six certainty values per species as the fetch path.

**M3. Divergence fails silently at runtime.** **[VERIFIED]** `app/index.html:9860`
downgrades a failed fetch to `console.warn`. A user on `file://` gets stale data with no
visible signal.
*Needed:* **[OPEN]** — whether a visible indicator is wanted is a product decision, but
at minimum the embedded blobs should carry a generation stamp that the app can log.

**M4. No test guards the `sync_embedded.py` anchor strings.** **[VERIFIED]** The second
anchor is a literal banner-comment string; 58 such banners exist in `app/index.html`.
*Needed:* explicit sentinel markers around the embedded blocks, or an assertion that
exactly one anchor match exists between the two constants.

## Link 2→3 — Human-readable documents to JSON

**M5. Nothing validates that `data/*.md` and `app/data/*.json` agree.** **[VERIFIED]**
This is the weakest link in the entire chain and the one where the non-negotiable rule
is at greatest risk, because it is the only step performed by a human reading prose.
*Needed, in increasing order of ambition:*
1. Row-count and identifier correspondence (each Markdown taxon section maps to a
   `@id` in `species.json`, and vice versa; likewise for milestones).
2. DOI-set equality between each Markdown table and the corresponding JSON entries —
   currently impossible for species, see M6.
3. Assertion that certainty enums recommended in the Markdown match the JSON. There is
   a ready-made test case: `data/Hominines-...-2026.md:284-288` states the exact expected
   values for the *H. longi* / *H. juluensis* entry (`ACTIVE_DEBATE`, `INDIRECT_DATA`,
   `SPECULATIVE_HYPOTHESIS`, `EVOLUTIONARY_INFERENCE`). Nothing verifies it.

**M6. `app/data/species.json` has no field able to hold a DOI.** **[VERIFIED]** — 0 of
21 species carry any reference key. The DOI chain is severed at the JSON boundary for the
entire species catalogue, which makes `CONTRIBUTING.md:9` structurally unenforceable
there.
*Needed:* **[OPEN]** — a schema decision. Adding, say, `hominin:references` is a data-model
change and must not be bundled into a document migration.

**M7. Epistemic status is largely absent from `app/data/events.json`.** **[VERIFIED]** —
`hominin:debateLevel` and `hominin:evidenceType` present on 2 of 30; DOI-bearing
`dateReference` on 3 of 30, while the chronology Markdown has a `Débat` and a `DOI`
column for every row.
*Needed:* **[OPEN]** — confirm whether full coverage is intended. If it is, a test should
assert presence on every event; if it is not, the asymmetry should be documented so that
future conversions do not read the absence as "no debate exists".

## Link 1→2 — Primary sources to human-readable documents

**M8. No DOI validation of any kind.** **[VERIFIED]** No format check, no
duplicate-detection, no resolvability check, in either the Markdown or the JSON.
`CONTRIBUTING.md:111` and `README.md:186` both warn that assistant-generated identifiers
can be invented — the warning is real and entirely unenforced.
*Needed:* a syntactic `10.\d{4,9}/\S+` check across `data/**` and `app/data/*.json` (offline,
CI-safe), plus an optional opt-in network resolution job.

**M9. Provenance of each claim is not machine-readable.** **[INFERENCE]** The August 2026
audit annotations (e.g. `data/Chronologie-...-2026.md:4`) assert that DOIs were "vérifiés
à la source primaire", but this is prose. Nothing records which claims were verified,
when, or by whom.
*Needed:* **[OPEN]** — a per-claim verification stamp is a data-model decision for the
maintainer.

## Cross-cutting

**M10. No JSON-LD schema validation.** **[VERIFIED]** Malformed `@context`, a missing
`hominin:periodStart`, or a wrong type is only caught indirectly, if at all, by browser
assertions in `tests/unit.test.js`.
*Needed:* a standalone Node or Python validator run in CI, independent of Playwright, so
that data errors are reported as data errors rather than as browser test failures.

**M11. Certainty vocabularies are duplicated in four places with no single source.**
**[VERIFIED]** — `tests/unit.test.js:117-118`, `README.md:117-129`,
`.ai-context/data-schema.md:78-88`, and `scripts/rename_certainty_enums.py:12-21` each
carry their own copy. `rename_certainty_enums.py` keeps them aligned by blind string
replacement across six files including `README.md`.
*Needed:* one machine-readable enum definition that the test imports and the docs are
checked against.

**M12. Documented counts are unverified and have already drifted.** **[VERIFIED]** — see
the drift table in the source-of-truth section; four documents state four different,
wrong counts.
*Needed:* a check that any count asserted in `README.md`, `.ai-context/CONTEXT.md`, and
`.ai-context/data-schema.md` matches the data, or removal of hard numbers from prose.

**M13. `npm test` exits 0 on failure.** **[VERIFIED]** `tests/run-all.js:83` is
`process.exit(CI ? 1 : 0)`. A contributor following `CONTRIBUTING.md:99`
("Tests pass: `node tests/run-all.js`") sees red output but a success exit code, and
tooling that gates on exit status will pass.
*Needed:* make failure exit non-zero by default, or change the documented command to
`node tests/run-all.js --ci`.

**M14. Event count is only checked as `>= 15`.** **[VERIFIED]**
`tests/unit.test.js:161-164`. Losing 15 of 30 events would not fail the suite. Contrast
with the species check at line 33-36, which pins the count exactly.

**M15. No CI job runs any of the three Python scripts.** **[VERIFIED]** Neither
`test.yml` nor `static.yml` installs Python or executes anything under `scripts/`. The
scripts can rot undetected, and `scripts/.gitignore` hints they were treated as local
utilities.

---

# Open questions

Each of these blocks or shapes the migration and cannot be resolved from the repository
alone.

**Q1 — Is the intent that English documents become genuinely primary, or that they are
published translations placed at the root for reach?** This determines whether Step 7 of
the plan happens at all. The two answers imply different headers, different
`CONTRIBUTING.md` wording, and different review obligations. (Relates to Risk 1.)

**Q2 — How will the English documents be produced, and who reviews the epistemic
wording?** Given the hedged, dual-axis debate statements documented in Risk 2, and given
that the project's own `translate_species.py` refuses to guess rather than approximate,
what is the acceptable process — and who signs off that no claim was strengthened,
simplified, or dropped?

**Q3 — Should the French and English documents be structurally locked to each other?**
If yes, on what — section headings, row counts, DOI sets, all three? This decides whether
M-item 8 in the plan is a CI check or a review convention.

**Q4 — Is the absence of any DOI field in `app/data/species.json` intentional?** If the
JSON layer is meant to be presentation-only, that should be stated so future conversions
do not read the absence as evidence of unsourced claims. If it is an omission, adding
`hominin:references` is a schema change that should be scheduled separately from the
migration. (See M6.)

**Q5 — Should `hominin:debateLevel` / `hominin:evidenceType` cover all 30 events, or only
the two they currently cover?** Until this is answered, no automated
Markdown→JSON check can distinguish "no debate" from "not yet recorded", and any
conversion tool will have to guess — which the non-negotiable rule forbids. (See M7.)

**Q6 — Is bumping the `?v=catalogue-21-20260828` cache token part of the release
routine?** If yes it should be automated in `sync_embedded.py`; if no, returning users
may hold a stale catalogue after a data update. (`app/index.html:9850`.)

**Q7 — Is embedded-data parity a supported guarantee or a best-effort convenience?**
`README.md:68` and `.ai-context/CONTEXT.md:63` disagree in tone — the README makes it
conditional on caring about offline use, CONTEXT.md states it as an obligation. The
answer determines whether M1 and M2 are CI blockers or advisory warnings.

**Q8 — Are the four conflicting documented counts (18 / 14 / 21 species; 22 / 27 / 30
events; 58 / ~77 tests) safe to correct?** They are documentation facts about the data,
not scientific claims, so correcting them appears to fall outside the non-negotiable
rule — but the correction was deliberately not made in this audit. Confirmation
requested. (See the drift table.)

**Q9 — Should `scripts/rename_certainty_enums.py` be retained?** Its own docstring says
"One-off". It rewrites `README.md` and `.ai-context/data-schema.md` by blind string
replacement, which is a hazard if run after those files are restructured. Archive,
delete, or keep with a guard?

**Q10 — Does the repository-root `data/` directory need to be reachable from the
deployed site?** `static.yml:40` publishes only `./app`, so the scientific documents are
visible on GitHub but not at `ho.lookingforanswers.eu`. **[VERIFIED]** If the English
documents are being promoted partly for reach, this constraint is worth revisiting —
though it is independent of the file move itself.
