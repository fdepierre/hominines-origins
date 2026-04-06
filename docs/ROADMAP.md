# Roadmap

This is a living document. Priorities may shift based on community contributions.

---

## v0.2 — Data extraction ✓ DONE

- [x] Extract `SPECIES_DATA` from `app/index.html` into `data/species.json`
- [x] Extract `EVENTS_DATA` into `data/events.json`
- [x] The app reads these JSON files at load time (with embedded fallback for offline/file://)
- [x] Benefit: data updates no longer require touching HTML/JS

## v0.3 — Ancient DNA mixing

- [ ] Add a visualisation layer showing Neanderthal DNA % in modern populations
- [ ] Add Denisovan introgression map (South-East Asia, Oceania)
- [ ] Source: published population genetics datasets

## v0.4 — Accessibility

- [ ] Full screen reader support (ARIA live regions for timeline changes)
- [ ] Keyboard navigation for the map
- [ ] High-contrast mode
- [ ] Reduced motion mode (respects `prefers-reduced-motion`)

## v0.5 — Educator pack

- [ ] Lesson plan templates (primary school, secondary, university)
- [ ] Printable timeline poster
- [ ] Quiz mode (test your knowledge of species and dates)
- [ ] Embed mode (iframe-friendly version)

## v1.0 — Offline / PWA

- [ ] Service worker for offline use
- [ ] Downloadable data package
- [ ] Works without internet access in schools, libraries, remote communities

---

## Ideas under consideration

- Species comparison view (side-by-side biometrics)
- 3D skull viewer (using published 3D scan data)
- Climate overlay (ice ages, sea levels at each time period)
- Audio narration (accessibility + engagement)
- Wikipedia integration (auto-link species names)
- Citizen science mode (let researchers flag data issues directly in the app)

---

*Open an issue to discuss any of these or propose new ideas.*
