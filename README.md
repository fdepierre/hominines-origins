# 🌍 Hominines Origins

**An open-source interactive map of human evolution — for everyone, everywhere.**

> *We are all African. We are all one species. This project exists to remind us.*

[![Live app](https://img.shields.io/badge/Live%20app-hominines--origins-orange)](https://www.perplexity.ai/computer/a/hominines-evolution-migrations-aF9mCFK2TkelGjanndW3aw)
[![License: CC BY 4.0](https://img.shields.io/badge/Data%20license-CC%20BY%204.0-blue)](https://creativecommons.org/licenses/by/4.0/)
[![License: MIT](https://img.shields.io/badge/Code%20license-MIT-green)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-74%20passing-brightgreen)](#tests)

---

## What this is

Hominines Origins is an interactive web application that visualises the full story of human evolution — from *Australopithecus afarensis* 4.1 million years ago to *Homo sapiens* today.

It shows:
- **Where** each hominine species appeared and lived (fossil sites, geographic ranges)
- **When** they lived (logarithmic timeline spanning 4.1 Ma to 2 000 years ago)
- **How they looked** — skin, eye and hair pigmentation based on genetic and fossil evidence
- **How they moved** — migration routes with directional arrows
- **What they invented** — fire, tools, symbolic art, burial, agriculture

The application runs entirely in the browser. No server, no database, no login. Open the HTML file and it works.

---

## Why this project exists

Every human being alive today shares a common ancestor in Africa. Every skin colour, every eye shape, every cultural tradition is a variation on the same theme — *Homo sapiens* adapting to different environments over tens of thousands of years.

This project is built on the belief that understanding our shared origins is one of the most powerful tools we have for building a more peaceful world. When you see that Neanderthals and *Homo sapiens* interbred, that modern Europeans carry genes from the Steppes, West Africa and Anatolia — the concept of a "pure" people becomes scientifically impossible.

This is not a political project. It is a scientific one. All data is sourced from peer-reviewed publications with DOI references.

**This project belongs to everyone.** Researchers, teachers, students, curious people, journalists, museum curators — anyone who wants to understand where we come from.

---

## The data

All scientific data lives in [`data/`](data/). These are the **primary sources** for everything shown in the app.

| File | Contents |
|------|----------|
| [`Hominines-Tableau-morphologique-et-pigmentation-complet-2026.md`](data/Hominines-Tableau-morphologique-et-pigmentation-complet-2026.md) | 12 hominine species: morphology, biometrics, pigmentation (skin/eyes/hair), fossil sites, migrations, tools, scientific debates. All claims cited with DOI. |
| [`Chronologie-prehistorique-Tableau-de-reference-scientifique-2026.md`](data/Chronologie-prehistorique-Tableau-de-reference-scientifique-2026.md) | 19 chronological milestones: Lomekwi tools (3.3 Ma), fire use, Bruniquel ritual structure, cave art, burials, beads, migrations to Australia and the Americas, Neolithic domestication. All with DOI and 2026 scientific status. |

The data files are written in Markdown and are **human-readable**. They are the single source of truth. When new research is published, the data files are updated first — then the app reflects the change.

---

## The application

The application is a single HTML file: [`app/index.html`](app/index.html).

**No build step. No npm install. No framework.** Open it in a browser.

### Features

- Interactive world map (Leaflet.js + CartoDB tiles)
- Logarithmic timeline — the only scale that makes sense when comparing 4 million years to 2 000 years
- Species panel with pigmentation swatches, human silhouette, biometrics, tools, debates
- Skin tone band showing the evolution of pigmentation from fur to modern diversity
- Cultural milestones band (fire emoji, stone tools, cave art…)
- Play button — animates the timeline, shows migration arrows moving in real time
- Dark / light mode
- **Multilingual** — auto-detects browser language. FR, EN, ES, DE, ZH, AR, PT, IT, JA, KO

### Technology

| Dependency | Role | Version |
|------------|------|---------|
| [Leaflet.js](https://leafletjs.com/) | Interactive map | 1.9.4 |
| [i18next](https://www.i18next.com/) | Internationalisation | 23.11.5 |
| [Space Grotesk / Space Mono](https://fonts.google.com/) | Typography | via Google Fonts |
| CartoDB tiles | Map tiles (dark + light) | CDN |

Everything else is vanilla HTML, CSS and JavaScript.

---

## Tests

A full non-regression test suite runs in Node.js with Playwright (headless Chromium).

```bash
# Install Playwright chromium once
npx playwright install chromium

# Run all tests (~30 seconds)
node tests/run-all.js

# Individual suites
node tests/unit.test.js     # Data integrity, timeline maths, bearing angles
node tests/visual.test.js   # Layout, contrast, pixel snapshots
node tests/a11y.test.js     # ARIA, touch targets, i18n, play/pause, tablet

# Update visual reference snapshots after an intentional change
UPDATE_SNAPSHOTS=1 node tests/visual.test.js
```

**What is tested:**

| Suite | Tests | What it catches |
|-------|-------|-----------------|
| Unit | 22 | Broken species data, wrong arrow direction, timeline math errors |
| Visual | 13 | Missing UI elements, WCAG contrast failures, layout regressions |
| A11y | 39 | Broken play/pause, language switching failures, touch target sizes, tablet layout |

---

## Contributing

This project welcomes contributions from:
- **Researchers** — new species data, updated citations, corrected pigmentation estimates
- **Translators** — new languages (add a block to the `TRANSLATIONS` object in `app/index.html`)
- **Developers** — UI improvements, new features, performance
- **Educators** — feedback on how to make the content more accessible
- **Everyone** — if something feels wrong or incomplete, open an issue

Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

All contributions must be backed by peer-reviewed sources with DOI references.

---

## Roadmap

- [ ] Extract `SPECIES_DATA` and `EVENTS_DATA` into separate JSON files (easier to update)
- [ ] Add *Homo floresiensis* deep dive (island dwarfism, unique evolution)
- [ ] Add ancient DNA mixing visualisation (Neanderthal % in modern populations)
- [ ] Offline / PWA mode
- [ ] Accessibility audit pass (screen reader support)
- [ ] Educator pack (lesson plans, printable materials)

---

## Credits

Scientific data compiled from published research (2022–2026). Key sources include:
- *Nature*, *Science*, *PNAS*, *Journal of Human Evolution*, *Current Biology*
- Ancient genomics studies (Reich Lab, Copenhagen group, Leipzig MPI)
- Palaeontological databases (AfricaMuseum, Smithsonian Human Origins)

Application built with [Perplexity Computer](https://www.perplexity.ai/computer).

---

## Licence

- **Code** (HTML/CSS/JS): [MIT License](LICENSE)
- **Scientific data** (Markdown files in `data/`): [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) — free to use, share and adapt with attribution
- **Visual snapshots** (PNG files in `tests/snapshots/`): [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

---

*"The story of humanity is not a story of races. It is a story of migrations."*
