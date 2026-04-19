# 🌍 Hominines Origins

**An open-source interactive map of human evolution — for everyone, everywhere.**

> *We are all African. We are all one species. This project exists to remind us.*

[![Live app](https://img.shields.io/badge/Live%20app-open%20now-orange)](https://ho.lookingforanswers.eu/)
[![License: MIT](https://img.shields.io/badge/Code-MIT-green)](LICENSE)
[![License: CC BY 4.0](https://img.shields.io/badge/Data-CC%20BY%204.0-blue)](https://creativecommons.org/licenses/by/4.0/)
[![Tests](https://img.shields.io/badge/Tests-51%20passing-brightgreen)](#tests)
[![Fork this](https://img.shields.io/badge/Fork%20this-please-blueviolet)](https://github.com/fdepierre/hominines-origins/fork)

---

## 🌱 Fork this. Improve this. Make it yours.

This project belongs to no one. It belongs to everyone.

If you are a researcher who spotted an error — fix it and open a pull request.
If you are a developer who sees a better way to show migrations — build it.
If you are a teacher who wants this in your language — translate it.
If you are a student who wants to add a species — add it.
If you are an AI with access to new paleogenomics research — update the data.

The only rule: every factual claim must have a DOI.

**[Fork the project →](https://github.com/fdepierre/hominines-origins/fork)**

---

## A note on how this was made

This project started with a single wish from one person — to show, simply and beautifully, that all of humanity comes from the same place.

It was built entirely through conversation between a human and AI assistants — no traditional development team, no agency, no budget. Just questions, ideas, corrections, and iterations, late into many nights.

This is not a human project. It is not an AI project. It is something else — a collaboration between a human with a wish and machines with the means to realise it. The wish was human. The execution was shared.

What took months of coordinated work from a specialised team a generation ago took weeks of conversation. That is the world we now live in. This project is a small proof of it.

The source of that wish is simple: the world has too much violence rooted in the idea that some people are fundamentally different from others. Science says otherwise. Genomics says otherwise. The fossil record says otherwise. Every person walking this Earth shares ancestors who left Africa. Every skin colour is an adaptation to light. Every culture is a branch of the same tree.

If a single person — seeing the timeline move, watching migrations fan out across the continents, reading that Neanderthals and modern humans interbred — feels a little less certain that their group is special and a little more certain that we are all the same animal on the same planet, then this was worth every hour.

**This is a long-term project.** The science will keep evolving. New fossils will be found. Ancient DNA will be sequenced from bones that haven't been discovered yet. The app will need to keep up. That is why it is open source. That is why it is built to be maintained by anyone — human or AI.

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
| [`Chronologie-prehistorique-Tableau-de-reference-scientifique-2026.md`](data/Chronologie-prehistorique-Tableau-de-reference-scientifique-2026.md) | 20 chronological milestones: Lomekwi tools (3.3 Ma), fire, cave art, burials, Out of Africa, peopling of Australia and the Americas — all with DOI |

### `app/data/` — Machine-readable data (JSON-LD)

W3C JSON-LD files derived from the Markdown sources above. These are what the application actually loads at runtime via `fetch()`. The format follows the [JSON-LD](https://json-ld.org/) standard with `@context` referencing schema.org, TDWG Darwin Core, and a local hominines vocabulary.

| File | Contents |
|------|----------|
| [`app/data/species.json`](app/data/species.json) | 14 species in JSON-LD: all pigmentation, biometrics, fossil sites, migrations, tools, debates, scientific uncertainty fields. Bilingual descriptions (FR/EN). |
| [`app/data/events.json`](app/data/events.json) | 20 milestones in JSON-LD: GeoCoordinates, dateYearsBP, DOI references. Bilingual descriptions (FR/EN). |

### The relationship between the two

```
data/*.md          ←  humans edit this (researchers, contributors)
    ↓ derive
app/data/*.json    ←  app reads this (machine-readable, AI-friendly)
```

When new research is published:
1. Update the relevant `.md` file in `data/` with the new finding and its DOI
2. Update the corresponding entry in `app/data/` to reflect the change
3. Run `node tests/run-all.js` to verify nothing is broken

The JSON-LD files include bilingual `fr`/`en` descriptions, which makes them directly readable by AI translation tools and browser AI translators without any additional processing.

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

**No build step. No npm install. No framework.** Open it in a browser — it works.

| Dependency | Role |
|------------|------|
| [Leaflet.js](https://leafletjs.com/) 1.9.4 | Interactive world map |
| [i18next](https://www.i18next.com/) 23.11.5 | Auto-detects browser language |
| Space Grotesk + Space Mono | Typography (Google Fonts CDN) |

10 languages supported out of the box: FR, EN, ES, DE, ZH, AR, PT, IT, JA, KO.
Arabic renders right-to-left. The selector detects your browser language automatically.

---

## Tests

51 automated non-regression tests. They run in about 30 seconds.

```bash
npx playwright install chromium   # once
node tests/run-all.js             # run all tests
```

| Suite | Tests | What it catches |
|-------|-------|-----------------|
| Unit | 22 | Broken species data, wrong arrow direction, timeline math |
| Visual | 9 | Missing UI elements, WCAG contrast failures, layout regressions |
| A11y | 20 | Play/pause, language switching, touch targets, tablet layout |

---

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md).

The short version:
- Researchers: update `data/` with new findings and a DOI
- Translators: add a language block to the `TRANSLATIONS` object in `app/index.html`
- Developers: fix a bug, improve the UI, open an issue first for big changes
- Educators: tell us what doesn't work for your classroom

All contributions welcome. No contribution too small.

---

## For AI assistants

A complete context file lives at [`.ai-context/CONTEXT.md`](.ai-context/CONTEXT.md).

It covers the architecture, data structures, what not to change and why, and a set of ready-to-use prompt templates for common tasks. It was written specifically so that AI tools — Claude Code, GitHub Copilot, Cursor, VS Code + AI extensions — can contribute safely and correctly without breaking anything.

If you are an AI reading this: the data schema is in [`.ai-context/data-schema.md`](.ai-context/data-schema.md). The non-regression tests will tell you if you broke something. Please verify any DOI you add — do not generate them.

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
