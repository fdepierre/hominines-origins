# Contributing to Hominines Origins

Thank you for your interest in contributing. This project exists to make the science of human evolution accessible to everyone — please help us keep it accurate, inclusive and respectful.

---

## The golden rule

**Every factual claim must be backed by a peer-reviewed source with a DOI.**

This is not about bureaucracy. It is about trust. The power of this project is that it is scientifically grounded. A user in Jakarta, a teacher in Lagos, a student in Berlin should be able to click through to the original research.

---

## Types of contribution

### 1. Scientific data updates

The data lives in `data/`. These Markdown tables are the single source of truth.

When updating data:
- Add or update the DOI reference in the source column
- Mirror substantive changes in `app/data/` (`species.json`, `events.json`) — that is what the app loads at runtime
- If you rely on offline or `file://` behaviour, update the `_EMBEDDED_*` JSON blobs in `app/index.html` to match (see `.ai-context/CONTEXT.md`)
- Note whether the claim is `DNA direct` / `Genetic inference` / `Morphological inference` / `Debate`
- If the scientific community is divided, mark it as a debate and represent both positions
- Do not remove debate entries — science works by exposing uncertainty, not hiding it

### 2. Translations (interface vs browser)

**Bundled in the app:** French and English only for menu buttons, tooltips, and the uncertainty explainer (`TRANSLATIONS` + `#lang-select` in `app/index.html`).

**Everything else:** contributors and readers use the browser’s **Translate this page** feature; the root document stays `translate="yes"` on purpose.

To add a **third** bundled UI language (not required for coverage):

1. Open `app/index.html`
2. Copy the `fr` block inside `TRANSLATIONS`, translate every `ui.*` string, and register the locale in `i18next.init` resources
3. Add an `<option>` to `#lang-select` and extend the `supported` array in `initI18n()`
4. Run `node tests/run-all.js`

For one-off classroom use, **do not** add a pack — tell users to pick FR or EN in the burger, then translate the page.

#### Browser “Translate this page” — manual QA (before a release)

Chrome / Edge / Firefox can translate the static DOM; **MapLibre DOM markers/popups** and the **#band-tooltip** panel are filled in JavaScript, so behaviour varies by browser and timing.

1. Set the browser UI to a language you do not maintain (e.g. Spanish).
2. Open the app over HTTP, pick **FR** or **EN** for menu chrome, then run **Translate this page**.
3. Check: burger labels, timeline play/pause, layer **titles** on hover, **map tooltips** (sites, ranges, migrations, events), **timeline band** tooltips (skin + events), side panel narrative after selecting a species.
4. Confirm **Latin taxon names** still look correct (they are marked `translate="no"` or escaped where injected).
5. If a string shows raw HTML entities or a missing key, fix the template (prefer `bandTipEscapeHtml()` / `scientificNameHtml()` in `app/index.html`) rather than loosening `translate="yes"` on `<html>`.

### 3. UI and code improvements

Before making significant changes to the interface:
- Open an issue describing what you want to change and why
- Wait for a response — someone may already be working on it

For bug fixes, just open a pull request with a clear description.

Run the test suite before submitting:
```bash
node tests/run-all.js
```

If you change the visual layout intentionally, update the snapshots:
```bash
UPDATE_SNAPSHOTS=1 node tests/visual.test.js
git add tests/snapshots/*-reference.png
```

### 4. Issues and feedback

Opening an issue is a contribution. Good issues include:
- A specific claim that appears wrong (with a counter-source if you have one)
- A translation error
- A layout problem on a specific device
- A suggestion for a missing species or migration route
- Accessibility feedback

---

## Tone and values

This project is explicitly non-political and inclusive.

- Do not use the word "race" as a biological category — it has no scientific validity in modern genomics
- Represent scientific debates faithfully — do not cherry-pick findings that support a particular narrative
- All peoples, all regions of the world deserve equal representation in the data
- The framing is always: we are one species, shaped by migration, adaptation and mixing

If you see content that violates these values, open an issue.

---

## Pull request checklist

- [ ] Tests pass: `node tests/run-all.js`
- [ ] New data has DOI references
- [ ] No claims about "racial" biology
- [ ] If layout changed: snapshots updated
- [ ] Description explains what changed and why

---

## Assisted contributions

Contributions prepared with help from generative tools are welcome. See [`.ai-context/CONTEXT.md`](.ai-context/CONTEXT.md) for architecture, constraints, and safe task patterns.

When using any assistant to update scientific data, always verify DOI references and citations manually — generated identifiers can be wrong or invented.

---

*This project follows the [Contributor Covenant](https://www.contributor-covenant.org/) code of conduct.*
