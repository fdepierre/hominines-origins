---
name: New translation
about: Improve French catalogue JSON or discuss browser translation of the English UI
title: '[TRANSLATION] '
labels: translation, good first issue
assignees: ''
---

## Language

**Language name:** <!-- e.g. French -->
**Language code (BCP 47):** <!-- e.g. fr -->
**Native speaker?** <!-- Yes / No / Partial -->

## Type of contribution

- [ ] Improve **French** (`fr`) catalogue strings in `app/data/species.json` or `events.json`
- [ ] Improve **English** (`en`) catalogue strings
- [ ] Report a browser “Translate this page” problem on the English chrome or Sources drawer

## Notes

<!-- Do not flatten debates. Homo longi / juluensis, Little Foot, Thomas Quarry I, and Homo naledi funerary claims must stay open in both languages. -->

---

**How to contribute:**

1. Chrome UI is English only. Readers use **Translate this page**.
2. Scientific narrative lives in JSON `{en,fr}` fields. Edit `fr` there; keep the same epistemic status as `en`.
3. Run `node tests/run-all.js`.
4. Open a pull request.

**Readers in other languages:** use the browser’s **Translate this page**. Optionally set **Catalogue language** to Français for the bundled scientific translation.
