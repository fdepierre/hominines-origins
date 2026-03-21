---
name: New translation
about: Add or improve a language translation
title: '[TRANSLATION] '
labels: translation, good first issue
assignees: ''
---

## Language

**Language name:** <!-- e.g. Russian -->
**Language code (BCP 47):** <!-- e.g. ru -->
**Native speaker?** <!-- Yes / No / Partial -->

## Type of contribution

- [ ] New language (not currently supported)
- [ ] Correction to existing translation
- [ ] Improvement to existing translation

## Notes

<!-- Any special considerations for this language (RTL? special characters? regional variants?) -->

---

**How to contribute a translation:**

1. Open `app/index.html`
2. Find the `TRANSLATIONS` object near the bottom
3. Copy the `en` block and translate every string
4. Add `<option value="XX">Language name</option>` to `#lang-select`
5. Test in browser
6. Submit a pull request
