# 🌍 Hominines Origins

**A research-paper data collection assisted by AI, and an interactive app generated from that knowledge.**

[![Live app](https://img.shields.io/badge/Live%20app-open%20now-orange)](https://ho.lookingforanswers.eu/)
[![License: MIT](https://img.shields.io/badge/Code-MIT-green)](LICENSE)
[![License: CC BY 4.0](https://img.shields.io/badge/Data-CC%20BY%204.0-blue)](https://creativecommons.org/licenses/by/4.0/)
[![Tests](https://img.shields.io/badge/Tests-57%20passing-brightgreen)](#tests)
[![Fork this](https://img.shields.io/badge/Fork%20this-please-blueviolet)](https://github.com/fdepierre/hominines-origins/fork)

---

## Introduction

Hominines Origins is a structured collection of data extracted from research papers with the help of AI. The application is generated from that knowledge to make hominine species, fossil sites, migrations, pigmentation evidence, and cultural milestones easier to explore.

The goal is to keep the data traceable, correctable, and reusable. Factual claims should stay linked to scientific sources, preferably with DOI references when available.

---

## What this project shows

Hominines Origins is an interactive web application that visualises the full story of human evolution — from *Australopithecus afarensis* 4.1 million years ago to *Homo sapiens* today.

- **Where** each hominine species appeared and lived (fossil sites, geographic ranges)
- **When** — a logarithmic timeline spanning 4.1 million years, the only scale that makes both timescales visible at once
- **How they looked** — skin, eye and hair pigmentation based on genetic and fossil evidence
- **How they moved** — directional migration arrows, animated in real time
- **What they invented** — fire, tools, symbolic art, intentional burial, agriculture

The application runs entirely in the browser. No server, no database, no login. Download the file and it works offline.

---

## The data

This project has two layers of data, each with a distinct role.

### `data/` — Scientific sources (human-readable)

Markdown tables written for humans: researchers, teachers, contributors. These are the **primary sources** — citable, correctable, editable without touching any code.

| File | Contents |
|------|----------|
| [`Hominines-Tableau-morphologique-et-pigmentation-complet-2026.md`](data/Hominines-Tableau-morphologique-et-pigmentation-complet-2026.md) | 12 hominine species: morphology, biometrics, pigmentation, fossil sites, migrations, tools, scientific debates — all with DOI |
| [`Chronologie-prehistorique-Tableau-de-reference-scientifique-2026.md`](data/Chronologie-prehistorique-Tableau-de-reference-scientifique-2026.md) | Human-readable chronological milestones (tools, fire, art, burials, migrations, domestication — all with DOI). Keep in sync with [`app/data/events.json`](app/data/events.json), which currently lists **22** events. |

### `app/data/` — Machine-readable data (JSON-LD)

W3C JSON-LD files derived from the Markdown sources above. These are what the application actually loads at runtime via `fetch()`. The format follows the [JSON-LD](https://json-ld.org/) standard with `@context` referencing schema.org, TDWG Darwin Core, and a local hominines vocabulary.

| File | Contents |
|------|----------|
| [`app/data/species.json`](app/data/species.json) | 14 species in JSON-LD: all pigmentation, biometrics, fossil sites, migrations, tools, debates, scientific uncertainty fields. Narrative fields use `fr` as the canonical language in the running app (parallel `en` is often present in the file for reuse and tooling). |
| [`app/data/events.json`](app/data/events.json) | **22** milestones in JSON-LD: GeoCoordinates, `hominin:dateYearsBP`, DOI references. Same pattern: French-first in the UI, optional `en` in the data. |

### The relationship between the two

```
data/*.md          ←  humans edit this (researchers, contributors)
    ↓ derive
app/data/*.json    ←  app reads this (machine-readable, AI-friendly)
```

When new research is published:
1. Update the relevant `.md` file in `data/` with the new finding and its DOI
2. Update the corresponding entry in `app/data/` (`species.json` and/or `events.json`) to reflect the change (species rows include the six `hominin:*DebateLevel` / `hominin:*EvidenceType` certainty fields)
3. If you care about **offline** or **`file://`** use, update the embedded JSON mirrors (`_EMBEDDED_SPECIES`, `_EMBEDDED_EVENTS`) inside [`app/index.html`](app/index.html) so they match `app/data/` — otherwise `fetch` failures will load stale data
4. Run `node tests/run-all.js` to verify nothing is broken

Many JSON-LD narrative fields carry both `fr` and `en`, but the **page is authored so browsers may translate the whole document**: `<html translate="yes">` is kept when the UI language changes, while the raw JSON `<code id="json-code">` stays `translate="no"` so identifiers stay stable. **i18next** switches **French and English** chrome UI strings only; for any other language, or for translating French narrative wholesale, use the browser’s page translator. Map labels are rendered as DOM markers so browser translation can see them.

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

A claim reaches `CONSENSUS_FORT` when several of these lines converge and have survived repeated independent scrutiny. It stays at `EN_DEBAT_ACTIF` when specialists publish substantive critiques that have not yet been answered conclusively.

---

## Uncertainty axes

Every species entry in `app/data/species.json` carries these fields for each of the three domains (taxonomy, behaviour, pigmentation):

- `hominin:*DebateLevel` — how settled the scientific debate is on that specific claim
- `hominin:*EvidenceType` — what kind of evidence the claim rests on

### `hominin:debateLevel`

| Value | Meaning |
|-------|---------|
| `CONSENSUS_FORT` | Multiple independent peer-reviewed studies converge on the same conclusion. Existing critiques are minority positions and do not challenge the core result. |
| `CONSENSUS_MODERE` | Most specialists agree on the general interpretation, but legitimate debates persist on details: precise scenario, exact ancestor, numerical parameters. No fundamental controversy, just unresolved nuance. |
| `EN_DEBAT_ACTIF` | Teams are publishing opposing, well-argued interpretations in peer-reviewed journals. No position has yet stabilised the consensus. Both sides have serious data and arguments. This signals active science, not vague uncertainty. |
| `HYPOTHESE_SPECULATIVE` | The interpretation rests on very indirect inferences, weak analogies or models poorly constrained by data. Often overrepresented in media relative to its actual standing in the scientific literature. Not necessarily wrong — it may become `EN_DEBAT_ACTIF` if new data emerge. |

### `hominin:evidenceType`

| Value | Meaning |
|-------|---------|
| `DONNEES_DIRECTES` | Based on direct fossil description and measurement, radiometric dating, documented stratigraphic context. The link between observation and conclusion is short and traceable to primary description papers. |
| `DONNEES_INDIRECTES` | Based on secondary indicators: taphonomic context, spatial distribution of remains, comparison with modern or fossil analogues. One additional interpretive step is required, but the underlying observations remain tangible. |
| `INFERENCE_EVOLUTIVE` | Based on phylogenetic, genetic or ecological models, without direct data on the taxon in question. Typical for pigmentation when no ancient DNA is available, or for behaviours inferred by analogy with closely related species. |
| `NARRATIF_MEDIATIQUE` | The interpretation circulates mainly through press releases, public lectures, videos or social media rather than robust scientific syntheses. Flagging this value documents the gap between popular narrative and the actual state of the literature. It is not necessarily factually wrong — it is a question of proportionality and nuance. |

---

## The application

A single HTML file: [`app/index.html`](app/index.html).

**No build step. No runtime npm dependencies. No framework.** Open [`app/index.html`](app/index.html) in a browser over HTTP (or a static server) — it works. The repo includes **`package.json`** and Playwright **only** so contributors can run `node tests/run-all.js` / `npm test`.

| Dependency | Role |
|------------|------|
| [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/) 5.9.0 | Interactive vector world map |
| [i18next](https://www.i18next.com/) 23.11.5 | **French and English** menu / control strings; all other languages rely on the browser’s page translator |
| Space Grotesk + Space Mono | Typography (Google Fonts CDN) |

The app auto-selects **FR** or **EN** from the browser language and keeps the burger-menu selector for manual override (stored in `localStorage` as `ho_ui_lang`). For other languages, use **Translate this page**; the document root stays `translate="yes"` so browser translation is not blocked.

---

## Tests

**56** automated non-regression checks (named `test` cases across the three suites). They run in about 35–60 seconds.

```bash
npx playwright install chromium   # once
node tests/run-all.js             # run all tests
```

| Suite | Cases | What it catches |
|-------|-------|-----------------|
| Unit | 23 | Broken species/events data, wrong arrow direction, timeline math, skin periods |
| Visual | 9 (+ 8 PNG snapshot scenarios) | Missing UI elements, WCAG contrast, layout; PNG diff vs reference tiles |
| A11y | 24 | Play/pause, FR/EN i18n, Playwright welcome hints (`locale` es/fr/en), touch targets, tablet layout |

---

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md).

The short version:
- Researchers: update `data/` with new findings and a DOI
- Translators: improve the `fr` / `en` `TRANSLATIONS` blocks in `app/index.html` (see [CONTRIBUTING.md](CONTRIBUTING.md); a third bundled language is a large, explicit change)
- Developers: fix a bug, improve the UI, open an issue first for big changes
- Educators: tell us what doesn't work for your classroom

All contributions welcome. No contribution too small.

---

## For AI assistants

A complete context file lives at [`.ai-context/CONTEXT.md`](.ai-context/CONTEXT.md).

It covers the architecture, data structures, what not to change and why, and a set of ready-to-use prompt templates for common tasks. It was written specifically so that AI tools — Claude Code, GitHub Copilot, Cursor, VS Code + AI extensions — can contribute safely and correctly without breaking anything.

If you are an AI reading this: the data schema is in [`.ai-context/data-schema.md`](.ai-context/data-schema.md). Runtime data is loaded from `app/data/*.json` via `loadData()` in `app/index.html`, with embedded fallbacks when `fetch` fails — keep those mirrors in sync when you change JSON. The non-regression tests will tell you if you broke something. Please verify any DOI you add — do not generate them.

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

Built through conversation with AI assistants. Improved and maintained with [Claude Code](https://claude.ai/code) (Anthropic).

---

## Licence

- **Code** (HTML/CSS/JS): [MIT License](LICENSE) — use it for anything
- **Scientific data** (`data/`): [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) — share and adapt with attribution

---

*"The story of humanity is not a story of races. It is a story of migrations."*

*Fork it. Translate it. Correct it. Teach with it. Make it better.*
*All that is asked is that the science stays honest and the welcome stays open.*
