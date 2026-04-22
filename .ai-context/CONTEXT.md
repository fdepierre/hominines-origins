# AI Context — Hominines Origins

This file gives AI assistants (Claude Code, GitHub Copilot, Cursor, VS Code + AI extensions, ChatGPT, Gemini) everything they need to make useful, safe contributions to this project.

Read this file before making any changes.

---

## What this project is

An interactive single-page web application that visualises human evolution from 4.1 million years ago to 2 000 years ago. It runs entirely in the browser — no server and **no build step for the app**.

**Mission:** Make the science of human origins accessible to everyone on Earth, in their own language. The core message is that all humans share a common African ancestor — a scientific fact that, when understood, makes the concept of racial hierarchy impossible to sustain.

---

## Project structure

```
hominines-origins/
├── app/
│   ├── index.html              ← THE ENTIRE APPLICATION (single file; JS/CSS/HTML inline)
│   └── data/
│       ├── species.json        ← JSON-LD ItemList → runtime SPECIES_DATA (14 entries; includes six hominin certainty keys per species)
│       └── events.json         ← JSON-LD ItemList → runtime EVENTS_DATA (22 milestones)
├── data/
│   ├── Hominines-Tableau-morphologique-et-pigmentation-complet-2026.md
│   │   └── Human-readable species tables (12 named hominine rows in the source doc; JSON may split *H. sapiens* into phases — keep MD + JSON aligned by policy)
│   └── Chronologie-prehistorique-Tableau-de-reference-scientifique-2026.md
│       └── Human-readable milestone tables (row count may differ slightly from JSON; JSON is what the app loads)
├── tests/
│   ├── run-all.js              ← Run all tests: node tests/run-all.js
│   ├── unit.test.js            ← Data integrity, maths, arrow bearings
│   ├── visual.test.js          ← Layout, contrast, pixel snapshots
│   ├── a11y.test.js            ← ARIA, touch, i18n, play/pause
│   ├── utils/harness.js        ← Shared Playwright setup
│   └── snapshots/              ← Reference PNGs for visual regression
├── .ai-context/
│   ├── CONTEXT.md              ← This file
│   └── data-schema.md          ← JSON-LD source vs runtime objects (SPECIES_DATA, etc.)
├── package.json                ← Dev/test only: Playwright; `npm test` → run-all.js
├── README.md
├── CONTRIBUTING.md
└── LICENSE
```

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
let SPECIES_DATA   // Filled by loadData(); length 14 (catalogue entries)
let EVENTS_DATA    // Filled by loadData(); length 22 (milestones)
SKIN_PERIODS       // const — skin tone segments for the timeline band (see data-schema.md)
TIMELINE_MIN       // const — -4200000 (years BP, negative)
TIMELINE_MAX       // const — -1500 (years BP, negative)
```

**Timeline rows:** The UI renders **one horizontal row per species** in `SPECIES_DATA`, ordered by **`buildRowOrder()`** (sort by `start` descending — oldest at the bottom). There is **no** `LANE_ASSIGNMENTS` object in code. JSON may still contain **`hominin:lane`** on items; **`adaptSpecies` does not copy it** into the runtime object — treat it as legacy / documentation-only unless you extend the adapter.

Full field lists: `.ai-context/data-schema.md`.

### Timeline scale

The timeline uses a **logarithmic scale** (log10 of absolute year value). This is not a bug. It is the only way to show both "4.1 million years ago" and "3 000 years ago" on the same screen in a meaningful way.

Functions: `linearToTime(t)` and `timeToLinear(time)` — do not change these without updating all tests.

### Arrow direction (migration paths)

`getBearing(from, to)` returns a compass bearing in degrees (0 = North, 90 = East, 180 = South, 270 = West). The CSS triangle uses `border-bottom` which points up by default, so `rotate(bearing)` correctly points the arrowhead in the direction of travel. Do NOT add or subtract 180.

### Internationalisation

**Goal:** any visitor should be able to read the app in **their** language. Two mechanisms work together:

1. **Browser page translation** (Chrome / Edge / Safari / Firefox “Translate this page”) — primary path for languages **outside** the bundled list. Keep `<html translate="yes">` (re-applied after `i18next` init and on `languageChanged`). Do **not** blanket `translate="no"` on panels or map chrome. Reserve `translate="no"` for machine-stable islands (e.g. `#json-code`, `#welcome-translate-hint`, **Latin taxon names** via `scientificNameHtml()` / `translate="no"` on timeline lane labels and the side-panel `.species-name`, so auto-translate does not corrupt `Homo sapiens`-style strings), the `#lang-select` block so option labels are not double-translated.

2. **i18next** — instant UI for **French and English** only (menu / controls / uncertainty explainer); `applyTranslations()` updates `[data-i18n]`, `[data-i18n-text]`, `[data-i18n-title]` (keys may be `ui.*` or bare keys — the handler avoids double `ui.ui`), and rebuilds bands/map when needed. Any HTML built from JSON for Leaflet or `#band-tooltip` must go through **`bandTipEscapeHtml()`**; roster names use **`scientificNameHtml()`** (`translate="no"`). Scientific narrative from JSON remains **French-first** in the DOM (many JSON entries also carry `en`). Optional `localStorage` key **`ho_ui_lang`** (`fr` \| `en`) is set from the welcome dialog.

The `TRANSLATIONS` object holds **fr** and **en** blocks only.

To add a **third** bundled language: copy the `fr` block, translate every `ui.*` string, add an `<option>` in `#lang-select`, extend the `supported` array in `initI18n()`, and keep `translate="no"` on the selector wrapper so option labels are not double-translated when users run page translation.

### Theme

The app has dark (default) and light modes controlled by `data-theme` on `<html>`. CSS variables are defined in `:root` (dark) and `[data-theme="light"]`. Both modes must pass WCAG AA contrast (≥ 4.5:1).

### npm / Playwright

The **application** has no npm dependency at runtime (CDN scripts only). The **repository** uses **`package.json`** and Playwright for automated tests. Contributors run `npx playwright install chromium` once, then `node tests/run-all.js` (or `npm test`).

---

## Data update workflow

When new research is published:

1. Update the relevant Markdown file in `data/`.
2. Update the corresponding JSON-LD in `app/data/` (`species.json` and/or `events.json` as appropriate). For species, keep the six certainty keys on the same object as the rest of the catalogue data.
3. If you rely on offline / `file://` behaviour, sync **`_EMBEDDED_SPECIES`** and/or **`_EMBEDDED_EVENTS`** in `app/index.html` with the same content (or regenerate from the JSON files).
4. Run tests: `node tests/run-all.js`.
5. If the visual layout changed intentionally, update snapshots: `UPDATE_SNAPSHOTS=1 node tests/visual.test.js`.
6. Open a pull request with the DOI of the new source.

**Rule:** Every factual claim must have a DOI. If you cannot find a DOI, mark the claim as `debate` or `inference`.

---

## Non-regression tests

Always run before committing:

```bash
node tests/run-all.js
```

The tests require Node.js and Playwright Chromium. Install once with:

```bash
npx playwright install chromium
```

Tests are written in plain Node.js — no test framework dependency. They run in about 30 seconds.

---

## What AI assistants should NOT do

- Do not split `app/index.html` into multiple files without explicit instruction.
- Do not change `linearToTime` / `timeToLinear` without updating all timeline tests.
- Do not assume `SPECIES_DATA` / `EVENTS_DATA` live on `window` — they are `let` in script scope (some play helpers are exposed on `window` intentionally; data arrays are not).
- Do not remove scientific debates from the data — uncertainty is part of the science.
- Do not use the word "race" as a biological category anywhere in the codebase.
- Do not hallucinate DOI references — always verify citations before adding them.
- Do not change the arrow rotation formula (`rotate(bearing)`) — the current formula is correct.

---

## Typical AI-assisted tasks

### Adding a new bundled UI language (optional)

"Add Russian as a **third** bundled UI language: copy the `fr` block in `TRANSLATIONS`, translate every `ui.*` string, add `<option value="ru">Русский</option>` to `#lang-select`, add `ru` to the `supported` array in `initI18n()`, then run `node tests/run-all.js`. For most classrooms, prefer **browser page translation** instead of growing `TRANSLATIONS`."

### Updating a species' pigmentation data

"In `app/data/species.json`, find the `Species` item with `@id` `heidelbergensis`. Update the `hominin:skinDesc` / related fields from [new paper DOI]. Mirror the change in `data/Hominines-Tableau-morphologique-et-pigmentation-complet-2026.md`. If you maintain offline parity, update `_EMBEDDED_SPECIES` in `app/index.html` and run `node tests/run-all.js`."

### Adding a new cultural milestone

"Add a new `Event` to `app/data/events.json` (and the embedded `_EMBEDDED_EVENTS` copy if used): e.g. earliest seafaring [DOI], with `hominin:category`, `hominin:icon`, GeoCoordinates, and `description` / `name` `fr`/`en`. Add the same milestone to `data/Chronologie-prehistorique-Tableau-de-reference-scientifique-2026.md`. Run `node tests/run-all.js`."

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
- Map: Leaflet.js with CartoDB dark/light tiles.
- No frontend build tool and no SPA framework; optional **`npm`** only for the test runner.
