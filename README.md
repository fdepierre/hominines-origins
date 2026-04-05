# 🌍 Hominines Origins

**An open-source interactive map of human evolution — for everyone, everywhere.**

> *We are all African. We are all one species. This project exists to remind us.*

[![Live app](https://img.shields.io/badge/Live%20app-open%20now-orange)](https://www.perplexity.ai/computer/a/hominines-evolution-migrations-aF9mCFK2TkelGjanndW3aw)
[![License: MIT](https://img.shields.io/badge/Code-MIT-green)](LICENSE)
[![License: CC BY 4.0](https://img.shields.io/badge/Data-CC%20BY%204.0-blue)](https://creativecommons.org/licenses/by/4.0/)
[![Tests](https://img.shields.io/badge/Tests-74%20passing-brightgreen)](#tests)
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

It was built entirely through conversation. Hundreds of exchanges between a human and an AI — Perplexity Computer — that has access to the whole of recorded human knowledge. No traditional development team. No agency. No budget. Just questions, ideas, corrections, and iterations, late into many nights.

This is not a human project. It is not an AI project. It is something else — a collaboration between a human with a wish and a machine with the means to realise it. The wish was human. The execution was shared.

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
| [`app/data/species.json`](app/data/species.json) | 12 species in JSON-LD: all pigmentation, biometrics, fossil sites, migrations, tools, debates. Bilingual descriptions (FR/EN). |
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

74 automated non-regression tests. They run in about 30 seconds.

```bash
npx playwright install chromium   # once
node tests/run-all.js             # run all tests
```

| Suite | Tests | What it catches |
|-------|-------|-----------------|
| Unit | 22 | Broken species data, wrong arrow direction, timeline math |
| Visual | 13 | Missing UI elements, WCAG contrast failures, layout regressions |
| A11y | 39 | Play/pause, language switching, touch targets, tablet layout |

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

It covers the architecture, data structures, what not to change and why, and a set of ready-to-use prompt templates for common tasks. It was written specifically so that AI tools — Perplexity Computer, GitHub Copilot, Cursor, VS Code + AI extensions — can contribute safely and correctly without breaking anything.

If you are an AI reading this: the data schema is in [`.ai-context/data-schema.md`](.ai-context/data-schema.md). The non-regression tests will tell you if you broke something. Please verify any DOI you add — do not generate them.

---

## Roadmap

- [x] Extract data into JSON-LD files (`app/data/species.json`, `app/data/events.json`)
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

Built through conversation with [Perplexity Computer](https://www.perplexity.ai/computer).

---

## Licence

- **Code** (HTML/CSS/JS): [MIT License](LICENSE) — use it for anything
- **Scientific data** (`data/`): [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) — share and adapt with attribution

---

*"The story of humanity is not a story of races. It is a story of migrations."*

*Fork it. Translate it. Correct it. Teach with it. Make it better.*
*All that is asked is that the science stays honest and the welcome stays open.*
