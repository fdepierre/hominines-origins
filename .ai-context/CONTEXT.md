# Project context — Hominines Origins

This file gives human contributors and coding assistants everything they need to make useful, safe changes to this repository.

Read this file before making any changes.

---

## What this project is

An interactive single-page web application that visualises human evolution from 7.5 million years ago to 2 000 years ago. It runs entirely in the browser — no server and **no build step for the app**.

**Mission:** Make the science of human origins accessible to everyone on Earth, in their own language. The core message is that all humans share a common African ancestor — a scientific fact that, when understood, makes the concept of racial hierarchy impossible to sustain.

---

## Project structure

```
hominines-origins/
├── app/
│   ├── index.html              ← THE ENTIRE APPLICATION (single file; JS/CSS/HTML inline)
│   └── data/
│       ├── species.json        ← JSON-LD ItemList → runtime SPECIES_DATA (six hominin certainty keys per species)
│       └── events.json         ← JSON-LD ItemList → runtime EVENTS_DATA
├── data/
│   ├── README.md               ← START HERE for the science: reading order, table layout, which layer wins
│   ├── data-schema.md          ← Field-by-field dictionary: JSON-LD keys vs runtime objects
│   ├── Hominins-Morphology-Pigmentation.md
│   │   └── English scientific reference (morphology, pigmentation, debates, DOI; filename has no year — update in place)
│   └── Prehistoric-Chronology-Scientific-Reference.md
│       └── English scientific reference (milestones, evidence, debate, DOI; JSON is what the app loads)
├── docs/
│   ├── README.md               ← Documentation index
│   ├── DATA_LINEAGE.md         ← LIVING policy: the three data layers, flow direction, safeguards
│   ├── scientific-references.md ← Curated bibliography; every DOI verified
│   └── ROADMAP.md
├── scripts/
│   ├── sync_embedded.py        ← JSON → embedded mirrors in app/index.html (one-way); --check for CI
│   ├── check_dois.py           ← Resolves every cited DOI against Crossref; --quiet for CI
│   └── check_md_json.py        ← Catalogue ids, DOI sets, debate/evidence tokens Markdown↔JSON
├── tests/
│   ├── run-all.js              ← Run all tests: node tests/run-all.js
│   ├── unit.test.js            ← Data integrity, maths, arrow bearings, embedded-fallback parity
│   ├── visual.test.js          ← Layout, contrast, pixel snapshots
│   ├── a11y.test.js            ← ARIA, touch, i18n, play/pause
│   ├── maplibre.test.js        ← Map sources, layers, labels, markers
│   ├── utils/harness.js        ← Shared Playwright setup
│   └── snapshots/              ← Reference PNGs for visual regression
├── .ai-context/
│   └── CONTEXT.md              ← This file (AI / contributor orientation — not human data docs)
├── package.json                ← Dev/test only: Playwright; `npm test` → run-all.js
├── README.md
├── CONTRIBUTING.md
└── LICENSE
```

**Counts are deliberately absent from this file.** `app/data/*.json` is the only
place that states how many species and milestones exist; run
`python scripts/sync_embedded.py --check` to print the current figures. See
[`docs/DATA_LINEAGE.md`](../docs/DATA_LINEAGE.md).

---

## Key technical facts

### The app file

`app/index.html` is one self-contained file. All JavaScript, CSS and HTML are inline.

**Do not split it** into separate files without discussion — the single-file architecture is intentional: it means anyone can download one file and run the app offline (with embedded JSON fallbacks when `fetch` fails).

### Runtime data flow

1. **`loadData()`** runs on startup. It `fetch`es [`app/data/species.json`](../app/data/species.json) and [`app/data/events.json`](../app/data/events.json) relative to the page (`./data/...` from `app/index.html`).
2. On success, JSON-LD `itemListElement` arrays are mapped with **`adaptSpecies`** / **`adaptEvent`** into **`SPECIES_DATA`** and **`EVENTS_DATA`** (`let` arrays in script scope — **not** on `window`). **`adaptSpecies`** copies the six `hominin:*DebateLevel` / `hominin:*EvidenceType` keys from each JSON item when present (`HOMININ_CERTAINTY_KEYS`).
3. **`window.__HOMININ_CERTAINTY_READY = true`** is set (tests wait on this flag in the harness), then **`bootApp()`** runs.

If `fetch` fails (`file://`, missing files, strict offline), the same **`_EMBEDDED_SPECIES`** and **`_EMBEDDED_EVENTS`** blobs inside `app/index.html` are used instead. **When you change the JSON files, update these embedded mirrors** so offline and `file://` users see the same catalogue as HTTP users.

**`file://`** may block or restrict `fetch`; use a local static server or the Playwright harness (serves `app/` over **http://127.0.0.1**).

### Other script-scope values (not on `window`)

```js
let SPECIES_DATA   // Filled by loadData(); one entry per catalogue species
let EVENTS_DATA    // Filled by loadData(); one entry per milestone
SKIN_PERIODS       // const — skin tone segments for the timeline band (see data-schema.md)
TIMELINE_MIN       // const — -7500000 (years BP, negative)
TIMELINE_MAX       // const — -2000 (years BP — alignée repère « 2 ka », fin dernier segment catalogue / peau)
```

**Timeline rows:** The UI renders **one horizontal row per species** in `SPECIES_DATA`, ordered by **`buildRowOrder()`** (sort by `start` descending — oldest at the bottom). There is **no** `LANE_ASSIGNMENTS` object in code. JSON may still contain **`hominin:lane`** on items; **`adaptSpecies` does not copy it** into the runtime object — treat it as legacy / documentation-only unless you extend the adapter.

Full field lists: [`data/data-schema.md`](../data/data-schema.md).

### Timeline scale

The timeline uses a **logarithmic scale** (log10 of absolute year value). This is not a bug. It is the only way to show both "7.5 million years ago" and "3 000 years ago" on the same screen in a meaningful way.

Functions: `linearToTime(t)` and `timeToLinear(time)` — do not change these without updating all tests.

### Arrow direction (migration paths)

`getBearing(from, to)` returns a compass bearing in degrees (0 = North, 90 = East, 180 = South, 270 = West). The CSS triangle uses `border-bottom` which points up by default, so `rotate(bearing)` correctly points the arrowhead in the direction of travel. Do NOT add or subtract 180.

Longitude deltas that feed `getBearing` (and the migration polyline / walking-figure interpolation) **must** go through `normaliseLngDelta` / `unwrapLng` / `migrationEnd`. Without that wrap, a Beringia crossing (69°E → 120°W) reads as west across Europe instead of east across the Pacific. Do not replace those helpers with a raw `to.lng - from.lng`.

### Internationalisation

**Goal:** any visitor should be able to read the app in **their** language. Two mechanisms work together:

1. **Browser page translation** (Chrome / Edge / Safari / Firefox “Translate this page”) — primary path for languages **outside** the bundled list. Keep `<html translate="yes">` (re-applied after the inline i18n `init` and on `languageChanged`). Do **not** blanket `translate="no"` on panels or map chrome. Reserve `translate="no"` for machine-stable islands (e.g. `#json-code`, `#welcome-translate-hint`, **Latin taxon names** via `scientificNameHtml()` / `translate="no"` on timeline lane labels and the side-panel `.species-name`, so auto-translate does not corrupt `Homo sapiens`-style strings), the `#lang-select` block so option labels are not double-translated.

2. **Inline i18n shim** (`window.i18next` in `app/index.html`, no CDN) — instant UI for **English and French** only (menu / controls / uncertainty explainer). The object exposes the same small API the old library used (`t`, `language`, `isInitialized`, `on`, `changeLanguage`, `init`) so call sites and tests stay unchanged. `applyTranslations()` updates `[data-i18n]`, `[data-i18n-text]`, `[data-i18n-title]` (keys may be `ui.*` or bare keys — the handler avoids double `ui.ui`), and rebuilds bands/map when needed. Any HTML built from JSON for MapLibre popups/markers or `#band-tooltip` must go through **`bandTipEscapeHtml()`**; roster names use **`scientificNameHtml()`** (`translate="no"`). Scientific narrative from JSON is **English-first** in the DOM (`fr` is a bundled translation). Optional `localStorage` key **`ho_ui_lang`** (`en` \| `fr`) stores the manual language override. Missing keys and missing `{fr,en}` fields fall back to **English**.

The `TRANSLATIONS` object holds **fr** and **en** blocks only.

To add a **third** bundled language: copy the `en` block, translate every `ui.*` string, add an `<option>` in `#lang-select`, add the code to `I18N_SUPPORTED`, and keep `translate="no"` on the selector wrapper so option labels are not double-translated when users run page translation.

### Theme

The app has dark (default) and light modes controlled by `data-theme` on `<html>`. CSS variables are defined in `:root` (dark) and `[data-theme="light"]`. Both modes must pass WCAG AA contrast (≥ 4.5:1).

### npm / Playwright

The **application** has no npm dependency at runtime. MapLibre, Prism and Google Fonts still load from CDNs (with SRI on the script/CSS files); FR/EN UI strings are inlined. The **repository** uses **`package.json`** and Playwright for automated tests. Contributors run `npx playwright install chromium` once, then `node tests/run-all.js` (or `npm test`).

---

## Data update workflow

When new research is published:

1. Update the relevant English scientific reference Markdown file in `data/` (see [`data/README.md`](../data/README.md) for the reading order and table conventions).
2. Update the corresponding JSON-LD in `app/data/` (`species.json` and/or `events.json` as appropriate). For species, keep the six certainty keys and `hominin:references` on the same object as the rest of the catalogue data. For events, set `hominin:debateLevel` and `hominin:evidenceType` (use `UNASSESSED` only when the chronology Markdown has no synthesis yet).
3. Regenerate the embedded mirrors: `python scripts/sync_embedded.py`. Never hand-edit **`_EMBEDDED_SPECIES`** / **`_EMBEDDED_EVENTS`** — the next sync overwrites them.
4. Verify correspondence and citations: `python scripts/check_md_json.py` then `python scripts/check_dois.py`.
5. Run tests: `node tests/run-all.js`.
6. If the visual layout changed intentionally, update snapshots: `UPDATE_SNAPSHOTS=1 node tests/visual.test.js`.
7. Open a pull request with the DOI of the new source.

**Rule:** Every factual claim must have a DOI. If you cannot find a DOI, mark the claim as `debate` or `inference`. Do not strengthen or silently drop epistemic qualifications when mirroring into JSON.

**A DOI that resolves is not automatically the right DOI.** `scripts/check_dois.py`
also compares the first author recorded by Crossref against the citing text,
because a live link to the wrong paper is harder to notice than a dead one.

---

## Non-regression tests

Always run before committing:

```bash
python scripts/sync_embedded.py --check   # JSON ↔ embedded mirrors agree
python scripts/check_md_json.py           # Markdown ids, DOIs, debate/evidence tokens
python scripts/check_dois.py              # every cited DOI resolves and matches
node tests/run-all.js                     # four browser suites
```

The browser tests require Node.js and Playwright Chromium. Install once with:

```bash
npx playwright install chromium
```

Tests are written in plain Node.js — no test framework dependency. Four suites
(unit, visual, a11y, MapLibre) take about three minutes; the Python gates are
near-instant apart from the Crossref lookups. Catalogue counts are asserted
against `app/data/*.json` rather than hard-coded, so growing the catalogue does
not require editing tests.

---

## What not to do

- Do not split `app/index.html` into multiple files without explicit instruction.
- Do not change `linearToTime` / `timeToLinear` without updating all timeline tests.
- Do not assume `SPECIES_DATA` / `EVENTS_DATA` live on `window` — they are `let` in script scope (some play helpers are exposed on `window` intentionally; data arrays are not).
- Do not remove scientific debates from the data — uncertainty is part of the science.
- Do not use the word "race" as a biological category anywhere in the codebase.
- Do not hallucinate DOI references — always verify citations with `python scripts/check_dois.py` before adding them.
- Do not write species or milestone counts into prose, badges or tests. `app/data/*.json` states them; everything else reads them.
- Do not change the arrow rotation formula (`rotate(bearing)`) — the current formula is correct. Longitude wrapping (`normaliseLngDelta` / `unwrapLng`) is a separate concern; do not confuse the two.

---

## Typical AI-assisted tasks

### Adding a new bundled UI language (optional)

"Add Russian as a **third** bundled UI language: copy the `en` block in `TRANSLATIONS`, translate every `ui.*` string, add `<option value="ru">Русский</option>` to `#lang-select`, add `ru` to `I18N_SUPPORTED`, then run `node tests/run-all.js`. For most classrooms, prefer **browser page translation** instead of growing `TRANSLATIONS`."

### Updating a species' pigmentation data

"In `app/data/species.json`, find the `Species` item with `@id` `heidelbergensis`. Update the `hominin:skinDesc` / related fields from [new paper DOI]. Mirror the change in `data/Hominins-Morphology-Pigmentation.md`. If you maintain offline parity, update `_EMBEDDED_SPECIES` in `app/index.html` and run `node tests/run-all.js`."

### Adding a new cultural milestone

"Add a new `Event` to `app/data/events.json` (and the embedded `_EMBEDDED_EVENTS` copy if used): e.g. earliest seafaring [DOI], with `hominin:category`, `hominin:icon`, GeoCoordinates, and `description` / `name` `fr`/`en`. Add the same milestone to `data/Prehistoric-Chronology-Scientific-Reference.md`. Run `node tests/run-all.js`."

### Fixing a visual bug

"The timeline needle is not visible in light mode. Look at the CSS for `#timeline-full-needle` and check if the colour is set as a CSS variable — it should use `var(--color-primary)` which is defined for both themes."

---

## Key design decisions

The live app is at: `https://ho.lookingforanswers.eu/`  
Source code: `https://github.com/fdepierre/hominines-origins`

- Single HTML file architecture (intentional).
- Logarithmic timeline (intentional, not a bug).
- Catalogue loaded from JSON-LD on disk, with embedded mirrors for fetch failure.
- Earthy colour palette: amber `#d4820a` on obsidian `#0e0d0b`.
- Fonts: Space Grotesk + Space Mono (Google Fonts CDN).
- Map: MapLibre GL JS with neutral vector styling and app-managed labels.
- No frontend build tool and no SPA framework; optional **`npm`** only for the test runner.
