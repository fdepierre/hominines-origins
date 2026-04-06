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
- Note whether the claim is `DNA direct` / `Genetic inference` / `Morphological inference` / `Debate`
- If the scientific community is divided, mark it as a debate and represent both positions
- Do not remove debate entries — science works by exposing uncertainty, not hiding it

### 2. New translations

The app supports 10 languages today. Adding a new one takes about 20 minutes.

1. Open `app/index.html`
2. Find the `TRANSLATIONS` object near the bottom of the file
3. Copy the `fr` block and translate every string
4. Add your language code to the `<select id="lang-select">` in the HTML
5. Test by opening the file in a browser and selecting your language
6. Open a pull request — include your name and the language in the PR title

No technical skills required beyond basic text editing.

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

## AI-assisted contributions

We welcome contributions made with AI tools (Claude Code, GitHub Copilot, Cursor, VS Code + AI extensions). See [`.ai-context/CONTEXT.md`](.ai-context/CONTEXT.md) for the context file that helps AI assistants understand this project.

When using AI to update scientific data, always verify the generated DOI references manually — AI systems can hallucinate citations.

---

*This project follows the [Contributor Covenant](https://www.contributor-covenant.org/) code of conduct.*
