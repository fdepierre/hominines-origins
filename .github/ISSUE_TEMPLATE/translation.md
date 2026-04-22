---
name: New translation
about: Improve French/English UI strings or discuss a third bundled language
title: '[TRANSLATION] '
labels: translation, good first issue
assignees: ''
---

## Language

**Language name:** <!-- e.g. Russian -->
**Language code (BCP 47):** <!-- e.g. ru -->
**Native speaker?** <!-- Yes / No / Partial -->

## Type of contribution

- [ ] Improve **French** (`fr`) `TRANSLATIONS` strings
- [ ] Improve **English** (`en`) `TRANSLATIONS` strings
- [ ] Propose a **third bundled UI language** (requires full `TRANSLATIONS` block + `initI18n` `supported` + `<option>` — large PR; browser page translation is usually enough)

## Notes

<!-- Any special considerations for this language (RTL? special characters? regional variants?) -->

---

**How to contribute:**

1. Open `app/index.html` — only **`fr`** and **`en`** blocks in `TRANSLATIONS` are shipped for menu chrome.
2. Edit the relevant `ui.*` keys; keep scientific narrative in JSON **French-first** (separate from i18next).
3. Run `node tests/run-all.js`.
4. Open a pull request.

**Readers in other languages:** use the browser’s **Translate this page** after picking FR or EN in the burger (welcome dialog explains this).
