# 🌍 Hominines Origins

**A research-paper data collection assisted by AI, and an interactive app generated from that knowledge.**

[![Live app](https://img.shields.io/badge/Live%20app-open%20now-orange)](https://ho.lookingforanswers.eu/)
[![License: MIT](https://img.shields.io/badge/Code-MIT-green)](LICENSE)
[![License: CC BY 4.0](https://img.shields.io/badge/Data-CC%20BY%204.0-blue)](https://creativecommons.org/licenses/by/4.0/)
[![Tests](https://img.shields.io/badge/Tests-passing-brightgreen)](#tests)
[![Fork this](https://img.shields.io/badge/Fork%20this-please-blueviolet)](https://github.com/fdepierre/hominines-origins/fork)

---

## Introduction

Hominines Origins is a structured collection of data extracted from research papers with the help of AI. The application is generated from that knowledge to make hominine species, fossil sites, migrations, pigmentation evidence, and cultural milestones easier to explore.

The goal is to keep the data traceable, correctable, and reusable. Factual claims should stay linked to scientific sources, preferably with DOI references when available.

---

## What this project shows

Hominines Origins is an interactive web application that visualises the full story of human evolution — from the oldest hominins in the catalogue (Miocene, ~7 Ma) through *Homo sapiens* today.

- **Where** each hominine species appeared and lived (fossil sites, geographic ranges)
- **When** — a logarithmic timeline spanning 7.5 million years, the only scale that makes both timescales visible at once
- **How they looked** — skin, eye and hair pigmentation based on genetic and fossil evidence
- **How they moved** — directional migration arrows, animated in real time
- **What they invented** — fire, tools, symbolic art, intentional burial, agriculture

The application runs entirely in the browser. No server, no database, no login. Download the file and it works offline.

---

## The data

This project has two layers of data, each with a distinct role.

### `data/` — Scientific sources (human-readable)

English scientific reference documents written for humans: researchers, teachers, contributors. These are the **editorial source of truth** — citable, correctable, editable without touching application code. They are syntheses from primary literature (not literal translations of prior working notes).

Start at [`data/README.md`](data/README.md): it explains which document to read first, how the tables are built, and where the field-by-field data dictionary lives.

| File | Contents |
|------|----------|
| [`Hominins-Morphology-Pigmentation.md`](data/Hominins-Morphology-Pigmentation.md) | Morphology, biometrics, pigmentation, confidence framework, active debates — with DOI |
| [`Prehistoric-Chronology-Scientific-Reference.md`](data/Prehistoric-Chronology-Scientific-Reference.md) | Chronological milestones (tools, fire, art, burials, migrations, domestication — with DOI, evidence type, and debate notes). Keep in sync with [`app/data/events.json`](app/data/events.json). |

### `app/data/` — Machine-readable data (JSON-LD)

W3C JSON-LD files derived from the English scientific reference documents above. These are what the application actually loads at runtime via `fetch()`. The format follows the [JSON-LD](https://json-ld.org/) standard with `@context` referencing schema.org, TDWG Darwin Core, and a local hominines vocabulary.

| File | Contents |
|------|----------|
| [`app/data/species.json`](app/data/species.json) | Catalogue entries in JSON-LD: all pigmentation, biometrics, fossil sites, migrations, tools, debates, scientific uncertainty fields. Narrative fields use `fr` as the canonical language in the running app (parallel `en` is often present in the file for reuse and tooling). |
| [`app/data/events.json`](app/data/events.json) | Chronological milestones in JSON-LD: GeoCoordinates, `hominin:dateYearsBP`, DOI references. Same pattern: French-first in the UI, optional `en` in the data. |

**How many entries are there?** The JSON files are the answer — no prose in this
repository states a count, on purpose. Counts drift the moment the catalogue
grows, so `app/data/` wins by definition (see
[`docs/DATA_LINEAGE.md`](docs/DATA_LINEAGE.md)). To read the current figures:

```bash
python scripts/sync_embedded.py --check   # prints "N species, M events"
```

### The relationship between the two

```
data/*.md          ←  humans edit this (English scientific reference — editorial truth)
    ↓ derive (manual)
app/data/*.json    ←  app reads this (executable truth)
```

When new research is published:
1. Update the relevant English `.md` file in `data/` with the finding, evidence type, debate notes, and DOI
2. Update the corresponding entry in `app/data/` (`species.json` and/or `events.json`) to reflect the change (species rows include the six `hominin:*DebateLevel` / `hominin:*EvidenceType` certainty fields)
3. Regenerate the embedded mirrors so offline and `file://` users see the same catalogue: `python scripts/sync_embedded.py`. Never hand-edit `_EMBEDDED_SPECIES` / `_EMBEDDED_EVENTS` inside [`app/index.html`](app/index.html) — the next sync overwrites them
4. Verify the citation you added: `python scripts/check_dois.py`
5. Run `node tests/run-all.js` to verify nothing is broken

Many JSON-LD narrative fields carry both `fr` and `en`, but the **page is authored so browsers may translate the whole document**: `<html translate="yes">` is kept when the UI language changes, while the raw JSON `<code id="json-code">` stays `translate="no"` so identifiers stay stable. A small **inline i18n engine** switches **French and English** chrome UI strings only; for any other language, or for translating French narrative wholesale, use the browser’s page translator. Map labels are rendered as DOM markers so browser translation can see them.

---

## Scientific Uncertainty Framework

Palaeontology and palaeoanthropology are empirical sciences, but not all claims rest on the same quality of evidence. A fossil can be measured directly. A burial practice can only be inferred from context. A skin colour can only be modelled from evolutionary theory when no ancient DNA survives. Treating all these claims as equally certain would misrepresent the science.

This catalogue uses two axes to qualify every piece of information **by domain** (taxonomy, behaviour, pigmentation), so that users can distinguish between what is solidly established, what is actively debated among specialists, and what is mainly a narrative product of media coverage.

---

## What leads to scientific consensus in hominin classification

Consensus in palaeoanthropology builds up through a convergence of independent lines of evidence, each with its own limitations and biases. No single study is sufficient. The process typically involves:

**Fossil description and morphometry**
A new taxon is proposed when a set of anatomical traits distinguishes it from known species. The initial description is reviewed by the journal's referees, then challenged or confirmed by independent teams re-examining the same material or finding new specimens. Agreement on the morphological diagnosis is the first step toward consensus.

**Chronological anchoring**
Radiometric dating (U-series, ESR, cosmogenic nuclides, palaeomagnetism) places the fossils in time. Multiple independent dating methods applied to the same site, yielding convergent ages, significantly strengthen a claim. A single date from a single method remains provisional.

**Phylogenetic placement**
Where does the new species fit in the hominin tree? This is often the most contested part. Cladistic analyses depend on which characters are included, how they are coded, and which outgroups are chosen. Disagreements here are normal and healthy; they do not undermine the existence of the species itself.

**Behavioural and cultural interpretation**
Claims about tool use, symbolic behaviour, burial practices or fire control require a higher evidentiary standard than morphological description. Taphonomic analysis must rule out natural explanations for the observed patterns. Experimental replication helps. Independent teams replicating the same contextual analysis at the same site is the gold standard. This step is where the gap between media coverage and scientific consensus tends to be widest.

**Genetic evidence**
When ancient DNA is recoverable, it provides direct evidence for taxonomy, pigmentation, population structure and admixture. When it is not (as for most pre-100 ka specimens), inferences must rely on evolutionary models, which carry considerably more uncertainty.

A claim reaches `STRONG_CONSENSUS` when several of these lines converge and have survived repeated independent scrutiny. It stays at `ACTIVE_DEBATE` when specialists publish substantive critiques that have not yet been answered conclusively.

---

## Uncertainty axes

Every species entry in `app/data/species.json` carries these fields for each of the three domains (taxonomy, behaviour, pigmentation):

- `hominin:*DebateLevel` — how settled the scientific debate is on that specific claim
- `hominin:*EvidenceType` — what kind of evidence the claim rests on

### `hominin:debateLevel`

| Value | Meaning |
|-------|---------|
| `STRONG_CONSENSUS` | Multiple independent peer-reviewed studies converge on the same conclusion. Existing critiques are minority positions and do not challenge the core result. |
| `MODERATE_CONSENSUS` | Most specialists agree on the general interpretation, but legitimate debates persist on details: precise scenario, exact ancestor, numerical parameters. No fundamental controversy, just unresolved nuance. |
| `ACTIVE_DEBATE` | Teams are publishing opposing, well-argued interpretations in peer-reviewed journals. No position has yet stabilised the consensus. Both sides have serious data and arguments. This signals active science, not vague uncertainty. |
| `SPECULATIVE_HYPOTHESIS` | The interpretation rests on very indirect inferences, weak analogies or models poorly constrained by data. Often overrepresented in media relative to its actual standing in the scientific literature. Not necessarily wrong — it may become `ACTIVE_DEBATE` if new data emerge. |

### `hominin:evidenceType`

| Value | Meaning |
|-------|---------|
| `DIRECT_DATA` | Based on direct fossil description and measurement, radiometric dating, documented stratigraphic context. The link between observation and conclusion is short and traceable to primary description papers. |
| `INDIRECT_DATA` | Based on secondary indicators: taphonomic context, spatial distribution of remains, comparison with modern or fossil analogues. One additional interpretive step is required, but the underlying observations remain tangible. |
| `EVOLUTIONARY_INFERENCE` | Based on phylogenetic, genetic or ecological models, without direct data on the taxon in question. Typical for pigmentation when no ancient DNA is available, or for behaviours inferred by analogy with closely related species. |
| `MEDIA_NARRATIVE` | The interpretation circulates mainly through press releases, public lectures, videos or social media rather than robust scientific syntheses. Flagging this value documents the gap between popular narrative and the actual state of the literature. It is not necessarily factually wrong — it is a question of proportionality and nuance. |

---

## The application

A single HTML file: [`app/index.html`](app/index.html).

**No build step. No runtime npm dependencies. No framework.** Open [`app/index.html`](app/index.html) in a browser over HTTP (or a static server) — it works. The repo includes **`package.json`** and Playwright **only** so contributors can run `node tests/run-all.js` / `npm test`.

| Dependency | Role |
|------------|------|
| [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/) 5.9.0 | Interactive vector world map (lazy-loaded from CDN with SRI; map is blank offline) |
| [Prism](https://prismjs.com/) 1.30.0 | JSON syntax highlighting in the data viewer only (deferred CDN, guarded — unhighlighted JSON if it fails) |
| Space Grotesk + Space Mono | Typography (Google Fonts CDN; system fonts if it fails) |

French and English menu / control strings are bundled in an **inline i18n engine** inside `app/index.html` — no third-party library. All other languages rely on the browser’s page translator.

The app auto-selects **FR** or **EN** from the browser language and keeps the burger-menu selector for manual override (stored in `localStorage` as `ho_ui_lang`). For other languages, use **Translate this page**; the document root stays `translate="yes"` so browser translation is not blocked.

---

## Tests

Four automated non-regression suites. The runner prints the authoritative case
count and per-suite result; a full run takes about three minutes.

```bash
npm ci                            # once — installs Playwright
npx playwright install chromium   # once — downloads the browser
node tests/run-all.js             # run all four suites
```

The suites drive a real browser against the app served over HTTP. The **UI
shell** (timeline, panel, FR/EN strings) is self-contained and works with no
network; **MapLibre, fonts and Prism** still load from CDNs, so a dropped
connection shows a blank map and fallback typography, not a blank page. The
a11y suite includes a CDN-outage case that asserts the shell still renders.

On Linux (including WSL) Chromium needs a few system libraries. If it fails to
start, install them once with `npx playwright install --with-deps chromium`
(needs sudo), which is what CI does. The Python gates below are plain standard
library and work on any Python ≥ 3.9.

| Suite | What it catches |
|-------|-----------------|
| Unit | Broken species/events data, exact catalogue counts, embedded-fallback parity, wrong arrow direction, timeline math, skin periods |
| Visual | Missing UI elements, WCAG contrast, layout; PNG diff against 8 reference tiles (per-OS baselines, `npm run test:update-snapshots` to refresh) |
| A11y | Play/pause, FR/EN i18n, welcome hints (`locale` es/fr/en), touch targets, tablet layout |
| MapLibre | Map sources and layers, neutral basemap, app-managed labels, walking figures, event markers |

Two data-integrity gates run in CI before the browser suites:

```bash
python scripts/sync_embedded.py --check   # JSON ↔ embedded mirrors agree
python scripts/check_dois.py              # every cited DOI resolves and matches its text
```

---

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md).

The short version:
- Researchers: update `data/` English scientific reference documents with new findings and a DOI
- Translators: improve the `fr` / `en` `TRANSLATIONS` blocks in `app/index.html` (see [CONTRIBUTING.md](CONTRIBUTING.md); a third bundled language is a large, explicit change)
- Developers: fix a bug, improve the UI, open an issue first for big changes
- Educators: tell us what doesn't work for your classroom

All contributions welcome. No contribution too small.

---

## Project context

A complete context file for contributors lives at [`.ai-context/CONTEXT.md`](.ai-context/CONTEXT.md).

It covers the architecture, data structures, what not to change and why, and a set of ready-to-use task templates. Use it to make safe, consistent changes to this repository.

The documentation index is [`docs/README.md`](docs/README.md). The data schema is in [`data/data-schema.md`](data/data-schema.md). Runtime data is loaded from `app/data/*.json` via `loadData()` in `app/index.html`, with embedded fallbacks when `fetch` fails — keep those mirrors in sync when you change JSON. The non-regression tests will tell you if you broke something. Please verify any DOI you add — do not invent or guess citation identifiers.

---

## Roadmap

- [x] Extract data into JSON-LD files (`app/data/species.json`, `app/data/events.json`)
- [x] Scientific Uncertainty Framework — per-domain debate and evidence fields
- [ ] Ancient DNA mixing visualisation (Neanderthal % in modern populations by region)
- [ ] Offline / PWA mode
- [ ] Educator pack with lesson plans and printable materials
- [ ] Full screen reader support

See [`docs/ROADMAP.md`](docs/ROADMAP.md) for the full list.

---

## Credits

Scientific data compiled from published research (2022–2026).
Key sources: *Nature*, *Science*, *PNAS*, *Journal of Human Evolution*, *Current Biology*, Reich Lab, Copenhagen Centre for GeoGenetics, Leipzig MPI.
Full bibliography: [`docs/scientific-references.md`](docs/scientific-references.md).

---

## Licence

- **Code** (HTML/CSS/JS): [MIT License](LICENSE) — use it for anything
- **Scientific data** (`data/`): [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) — share and adapt with attribution

---

*"The story of humanity is not a story of races. It is a story of migrations."*

*Fork it. Translate it. Correct it. Teach with it. Make it better.*
*All that is asked is that the science stays honest and the welcome stays open.*
