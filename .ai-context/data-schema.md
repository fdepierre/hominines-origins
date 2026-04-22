# Data Schema Reference

This file describes **(1)** JSON-LD fields in `app/data/*.json` and **(2)** the **runtime objects** produced in `app/index.html` by `adaptSpecies()` / `adaptEvent()` after `loadData()`.

Use it when adding or editing catalogue data or tests.

---

## JSON-LD source — `app/data/species.json`

Each `itemListElement` entry is a `Species`-shaped node (custom `hominin:` and `taxon:` properties). Important keys:

| Key | Role |
|-----|------|
| `@id` | Slug used as runtime `id` (e.g. `erectus`, `sapiens-africa`) |
| `taxon:scientificName` | Latin binomial → runtime `name` |
| `name` | Object with `fr` / `en` common labels → runtime `common` uses **`fr`** first |
| `hominin:periodStart`, `hominin:periodEnd` | Years BP (negative integers) → `start`, `end` |
| `hominin:color` | Hex lane colour → `color` |
| `hominin:regions` | Geographic ranges → `regions` |
| `hominin:fossilSites` | Sites (`lat`/`lng`; note: no `age` in JSON) → `sites` |
| `hominin:skinDesc`, `hominin:skinColor`, `hominin:skinVariant`, optional `hominin:skinVariantColor`, `hominin:skinSpectrumColors` | Pigmentation → nested `pigmentation.skin` |
| `hominin:eyesDesc`, … | → `pigmentation.eyes` |
| `hominin:hairDesc`, … | → `pigmentation.hair` |
| `hominin:pigmentationCertainty`, `hominin:pigmentationCertLabel` | → `pigmentation.certainty`, `pigmentation.certLabel` |
| `hominin:heightM`, `hominin:heightF`, `hominin:weightM`, `hominin:brain`, `hominin:dimorphism` | → `biometrics.*` |
| `hominin:tools`, `hominin:debate`, `hominin:migrations` | Arrays / strings → same names on runtime object |
| `hominin:taxonomyDebateLevel`, `hominin:taxonomyEvidenceType`, `hominin:behaviorDebateLevel`, `hominin:behaviorEvidenceType`, `hominin:pigmentationDebateLevel`, `hominin:pigmentationEvidenceType` | Uncertainty axes → copied onto runtime object by `adaptSpecies()` (`HOMININ_CERTAINTY_KEYS`) |
| `hominin:lane` | **Present in JSON only** — not copied by `adaptSpecies()`; timeline layout uses **one row per species** via `buildRowOrder(SPECIES_DATA)` |

---

## SPECIES_DATA — runtime array (after `adaptSpecies`)

One object per catalogue entry (currently **14**). Shape:

```js
{
  id:       String,   // from @id, e.g. "erectus", "sapiens-africa"
  name:     String,   // taxon:scientificName, e.g. "Homo erectus"
  common:   String,   // name.fr (French-first UI)
  start:    Number,   // hominin:periodStart (years BP, negative)
  end:      Number,   // hominin:periodEnd (must be > start)
  color:    String,   // Hex for timeline bar
  regions:  Array[{ name, lat, lng, radius, note? }],
  sites:    Array[{ name, lat, lng, note? }],  // no age field from JSON adapter
  pigmentation: {
    skin:   { desc, color, variant, variantColor?, spectrumColors? },
    eyes:   { desc, color, variant, variantColor? },
    hair:   { desc, color, variant, variantColor? },
    certainty: String,   // dna-direct | genetic | inference | debate
    certLabel: String,  // short UI label from JSON
  },
  biometrics: {
    heightM: String, heightF: String, weightM: String,
    brain: String, dimorphism: String,
  },
  tools:      Array[String],
  debate:     String,
  migrations: Array[{ from: [lat,lng], to: [lat,lng], label: String }],

  // From species.json, copied in adaptSpecies — use bracket notation:
  "hominin:taxonomyDebateLevel":       String,
  "hominin:taxonomyEvidenceType":     String,
  "hominin:behaviorDebateLevel":      String,
  "hominin:behaviorEvidenceType":     String,
  "hominin:pigmentationDebateLevel":  String,
  "hominin:pigmentationEvidenceType": String,
}
```

Use bracket notation for these keys: `species['hominin:taxonomyDebateLevel']`.

### Hominin certainty enums

| `*DebateLevel` | Meaning (short) |
|----------------|-----------------|
| `CONSENSUS_FORT` | Strong community agreement on framing |
| `CONSENSUS_MODERE` | Broad agreement with nuance on details |
| `EN_DEBAT_ACTIF` | Several serious interpretations coexist |
| `HYPOTHESE_SPECULATIVE` | Plausible but thinly tested |

| `*EvidenceType` | Meaning (short) |
|-----------------|-----------------|
| `DONNEES_DIRECTES` | Direct observation (e.g. ancient DNA, tightly informative remains) |
| `DONNEES_INDIRECTES` | Solid indirect fossil / archaeological context |
| `INFERENCE_EVOLUTIVE` | Comparative or model-based evolutionary inference |
| `NARRATIF_MEDIATIQUE` | Media-led narrative, weakly tied to primary literature |

Canonical values live on each species object in [`app/data/species.json`](../app/data/species.json). Tests serve `app/` over HTTP so `fetch` works.

### Pigmentation certainty (`pigmentation.certainty`)

| Value | Meaning |
|-------|---------|
| `dna-direct` | Direct ancient DNA with sequenced MC1R, SLC genes etc. |
| `genetic` | Genetic inference from related populations or statistical modelling |
| `inference` | Morphological or ecological inference |
| `debate` | Actively debated in the literature |

---

## JSON-LD source — `app/data/events.json`

Each `itemListElement` is an `Event` with `hominin:*` fields and `location.geo` for coordinates.

---

## EVENTS_DATA — runtime array (after `adaptEvent`)

**22** milestones. Shape:

```js
{
  id:       String,   // @id slug
  time:     Number,   // hominin:dateYearsBP (negative)
  label:    String,   // name.fr
  icon:     String,   // emoji
  color:    String,   // hex; aligns with CATEGORY_COLORS
  desc:     String,   // description.fr
  category: String,   // tools | fire | phylo | symbolic | art | migration | neolithic
  lat:      Number,
  lng:      Number,
  source:   String,   // hominin:dateReference (DOI / citation)
}
```

### Categories

| Category | Colour | Examples |
|----------|--------|---------|
| `tools` | #A07820 | Lomekwi tools, Acheulean biface |
| `fire` | #E06020 | Fire use >1 Ma, intentional fire-making |
| `phylo` | #805090 | Phylogenetic divergence events |
| `symbolic` | #C0A000 | Ochre, beads, burial |
| `art` | #8050C0 | Cave art, Sulawesi stencils |
| `migration` | #208060 | Out of Africa, peopling |
| `neolithic` | #60A040 | Domestication, agriculture |

---

## SKIN_PERIODS — const array in `app/index.html`

Skin tone band segments for the timeline strip (not loaded from JSON):

```js
{
  start:    Number,   // years BP (negative)
  end:      Number,   // must be > start
  color:    String,   // CSS hex or rgb
  cssClass: String,   // "" | "fur" | "partial-fur"
  label:    String,
  tip:      String,   // tooltip + source
}
```

Sorted ascending by `start` (oldest / most negative first).

---

## Timeline layout — one row per species

There is **no** shared multi-species “lane” map in code.

- **`buildRowOrder(speciesList)`** returns a copy of `speciesList` sorted by **`start` descending** (oldest species gets the **bottom** row in the track).
- Each species in `SPECIES_DATA` gets one `.species-lane` row; count must match `SPECIES_DATA.length` (see unit/visual tests).

---

## Adding a new species — checklist

- [ ] Add or extend the row(s) in `data/Hominines-Tableau-morphologique-et-pigmentation-complet-2026.md` with DOI.
- [ ] Add a new `Species` object to `app/data/species.json` (`@id`, periods, regions, sites, migrations as `[lat,lng]`, the six `hominin:*DebateLevel` / `hominin:*EvidenceType` keys, etc.).
- [ ] Update **`_EMBEDDED_SPECIES`** in `app/index.html` if offline parity matters.
- [ ] Run `node tests/run-all.js`.

## Adding a new milestone — checklist

- [ ] Add the milestone to `data/Chronologie-prehistorique-Tableau-de-reference-scientifique-2026.md` with DOI.
- [ ] Add a new `Event` to `app/data/events.json` (`@id`, `hominin:dateYearsBP`, `location`, `description`, …).
- [ ] Update **`_EMBEDDED_EVENTS`** in `app/index.html` if offline parity matters.
- [ ] Run `node tests/run-all.js`.
