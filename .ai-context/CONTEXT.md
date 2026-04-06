# AI Context — Hominines Origins

This file gives AI assistants (Claude Code, GitHub Copilot, Cursor, VS Code + AI extensions, ChatGPT, Gemini) everything they need to make useful, safe contributions to this project.

Read this file before making any changes.

---

## What this project is

An interactive single-page web application that visualises human evolution from 4.1 million years ago to 2 000 years ago. It runs entirely in the browser — no server, no build step.

**Mission:** Make the science of human origins accessible to everyone on Earth, in their own language. The core message is that all humans share a common African ancestor — a scientific fact that, when understood, makes the concept of racial hierarchy impossible to sustain.

---

## Project structure

```
hominines-origins/
├── app/
│   └── index.html              ← THE ENTIRE APPLICATION (single file, ~185 KB / ~48 KB gzipped)
├── data/
│   ├── Hominines-Tableau-morphologique-et-pigmentation-complet-2026.md
│   │   └── 12 species: morphology, pigmentation, sites, migrations, tools, debates
│   └── Chronologie-prehistorique-Tableau-de-reference-scientifique-2026.md
│       └── 19 milestones: tools, fire, art, migrations, domestication
├── tests/
│   ├── run-all.js              ← Run all tests: node tests/run-all.js
│   ├── unit.test.js            ← Data integrity, maths, arrow bearings
│   ├── visual.test.js          ← Layout, contrast, pixel snapshots
│   ├── a11y.test.js            ← ARIA, touch, i18n, play/pause
│   ├── utils/harness.js        ← Shared Playwright setup
│   └── snapshots/              ← Reference PNGs for visual regression
├── .ai-context/
│   ├── CONTEXT.md              ← This file
│   └── data-schema.md          ← Data structure reference for SPECIES_DATA etc.
├── README.md
├── CONTRIBUTING.md
└── LICENSE
```

---

## Key technical facts

### The app file

`app/index.html` is one self-contained file. All JavaScript, CSS and HTML are inline.

**Do not split it** into separate files without discussion — the single-file architecture is intentional: it means anyone can download one file and run the app offline.

### Data structures inside app/index.html

The app contains these JavaScript constants (declared with `const`, NOT attached to `window`):

```js
SPECIES_DATA     // Array[12] — one object per hominine species
EVENTS_DATA      // Array[20] — cultural/technological milestones
SKIN_PERIODS     // Array[9]  — skin tone segments for the timeline band
LANE_ASSIGNMENTS // Object    — maps species.id → lane index (0–4)
TIMELINE_MIN     // Number    — -4200000 (years)
TIMELINE_MAX     // Number    — -1500 (years)
```

Full schemas are in `.ai-context/data-schema.md`.

### Timeline scale

The timeline uses a **logarithmic scale** (log10 of absolute year value). This is not a bug. It is the only way to show both "4.1 million years ago" and "3 000 years ago" on the same screen in a meaningful way.

Functions: `linearToTime(t)` and `timeToLinear(time)` — do not change these without updating all tests.

### Arrow direction (migration paths)

`getBearing(from, to)` returns a compass bearing in degrees (0 = North, 90 = East, 180 = South, 270 = West). The CSS triangle uses `border-bottom` which points up by default, so `rotate(bearing)` correctly points the arrowhead in the direction of travel. Do NOT add or subtract 180.

### Internationalisation

The i18next library (CDN) handles language switching. The `TRANSLATIONS` object at the bottom of `app/index.html` contains all UI strings for 10 languages. The `applyTranslations()` function updates the DOM when the language changes.

To add a language: copy the `fr` block in `TRANSLATIONS`, translate every string, add an `<option>` in `#lang-select`.

### Theme

The app has dark (default) and light modes controlled by `data-theme` on `<html>`. CSS variables are defined in `:root` (dark) and `[data-theme="light"]`. Both modes must pass WCAG AA contrast (≥ 4.5:1).

---

## Data update workflow

When new research is published:

1. Update the relevant Markdown file in `data/`
2. Update the corresponding data in `app/index.html` (SPECIES_DATA or EVENTS_DATA)
3. Run tests: `node tests/run-all.js`
4. If the visual layout changed, update snapshots: `UPDATE_SNAPSHOTS=1 node tests/visual.test.js`
5. Open a pull request with the DOI of the new source

**Rule:** Every factual claim must have a DOI. If you cannot find a DOI, mark the claim as `debate` or `inference`.

---

## Non-regression tests

Always run before committing:
```bash
node tests/run-all.js
```

The tests require Node.js and Playwright chromium. Install once with:
```bash
npx playwright install chromium
```

Tests are written in plain Node.js — no test framework dependency. They run in about 30 seconds.

---

## What AI assistants should NOT do

- Do not split `app/index.html` into multiple files without explicit instruction
- Do not change `linearToTime` / `timeToLinear` without updating all timeline tests
- Do not add `window.` prefix to access `SPECIES_DATA` etc. — they are `const` in script scope, not on `window`
- Do not remove scientific debates from the data — uncertainty is part of the science
- Do not use the word "race" as a biological category anywhere in the codebase
- Do not hallucinate DOI references — always verify citations before adding them
- Do not change the arrow rotation formula (`rotate(bearing)`) — the current formula is correct

---

## Typical AI-assisted tasks

### Adding a new translation
"Add a Russian translation to the app. The TRANSLATIONS object is near the bottom of app/index.html. Copy the French block, translate every string, and add `<option value="ru">Русский</option>` to the language selector."

### Updating a species' pigmentation data
"In app/index.html, find the SPECIES_DATA entry for id:'heidelbergensis'. Update the skin pigmentation description based on [new paper DOI]. Also update the corresponding entry in data/Hominines-Tableau-morphologique-et-pigmentation-complet-2026.md."

### Adding a new cultural milestone
"Add a new event to EVENTS_DATA in app/index.html: the earliest evidence of seafaring [DOI]. It should have category:'migration', an appropriate emoji, lat/lng coordinates, and a description. Also add it to data/Chronologie-prehistorique-Tableau-de-reference-scientifique-2026.md."

### Fixing a visual bug
"The timeline needle is not visible in light mode. Look at the CSS for #timeline-full-needle and check if the colour is set as a CSS variable — it should use var(--color-primary) which is defined for both themes."

---

## Key design decisions

The live app is at: `https://ho.lookingforanswers.eu/`
Source code: `https://github.com/fdepierre/hominines-origins`

Key design decisions:
- Single HTML file architecture (intentional)
- Logarithmic timeline (intentional, not a bug)
- Earthy colour palette: amber #d4820a on obsidian #0e0d0b
- Fonts: Space Grotesk + Space Mono (Google Fonts CDN)
- Map: Leaflet.js with CartoDB dark/light tiles
- No npm, no build step, no framework
