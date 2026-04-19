# Data Schema Reference

This file describes the exact structure of every data object used in `app/index.html`.
Use this as a reference when adding or editing data.

---

## SPECIES_DATA — Array of species objects

```js
{
  id:       String,   // Unique slug, e.g. "erectus", "sapiens", "neanderthal"
  name:     String,   // Scientific name, e.g. "Homo erectus"
  common:   String,   // Common description, e.g. '"L\'homme debout"'
  start:    Number,   // Years BP as negative integer, e.g. -1800000
  end:      Number,   // Years BP as negative integer, e.g. -250000 (must be > start)
  color:    String,   // Hex color for this species' timeline lane, e.g. "#E07830"
  regions:  Array[{   // Geographic ranges
    name:   String,
    lat:    Number,
    lng:    Number,
    radius: Number,   // metres
    note:   String    // optional
  }],
  sites:    Array[{   // Known fossil sites
    name:   String,
    lat:    Number,
    lng:    Number,
    age:    String,   // human-readable, e.g. "1,8 Ma"
    note:   String    // optional
  }],
  pigmentation: {
    skin: {
      desc:    String,  // Description of skin colour
      color:   String,  // CSS hex color for the swatch
      variant: String | null  // "split" if variable, null otherwise
    },
    eyes: {
      desc:    String,
      color:   String,
      variant: String | null
    },
    hair: {
      desc:    String,
      color:   String,
      variant: String | null
    },
    certainty: String,  // "dna-direct" | "genetic" | "inference" | "debate"
    source:    String   // DOI or citation
  },
  biometrics: {
    height:    String,  // e.g. "160–185 cm"
    brainVol:  String,  // e.g. "850–1100 cm³"
    bodyMass:  String   // e.g. "40–68 kg"
  },
  tools:      Array[String],  // List of tool types/industries
  debate:     String,         // Summary of main scientific debate
  migrations: Array[{
    from:  [Number, Number],  // [lat, lng] — departure point
    to:    [Number, Number],  // [lat, lng] — arrival point
    label: String             // Human-readable description with approximate date
  }],

  // Optional on inline SPECIES_DATA until merge — stored in app/data/species.json and merged at runtime by species id:
  "hominin:taxonomyDebateLevel":       String,  // CONSENSUS_FORT | CONSENSUS_MODERE | EN_DEBAT_ACTIF | HYPOTHESE_SPECULATIVE
  "hominin:taxonomyEvidenceType":      String,  // DONNEES_DIRECTES | DONNEES_INDIRECTES | INFERENCE_EVOLUTIVE | NARRATIF_MEDIATIQUE
  "hominin:behaviorDebateLevel":      String,
  "hominin:behaviorEvidenceType":     String,
  "hominin:pigmentationDebateLevel":  String,
  "hominin:pigmentationEvidenceType": String
}
```

Use bracket notation in JavaScript: `species['hominin:taxonomyDebateLevel']` (colons in keys).

### Hominin certainty enums

| `*DebateLevel` | Meaning (short) |
|----------------|-----------------|
| `CONSENSUS_FORT` | Strong community agreement on framing |
| `CONSENSUS_MODERE` | Broad agreement with nuance on details |
| `EN_DEBAT_ACTIF` | Several serious interpretations coexist |
| `HYPOTHESE_SPECULATIVE` | Plausible but thinly tested |

| `*EvidenceType` | Meaning (short) |
|-----------------|-------------------|
| `DONNEES_DIRECTES` | Direct observation (e.g. ancient DNA, tightly informative remains) |
| `DONNEES_INDIRECTES` | Solid indirect fossil / archaeological context |
| `INFERENCE_EVOLUTIVE` | Comparative or model-based evolutionary inference |
| `NARRATIF_MEDIATIQUE` | Media-led narrative, weakly tied to primary literature |

Canonical per-species certainty rows live in [`app/data/species-certainty.json`](../app/data/species-certainty.json) and are merged onto `SPECIES_DATA` after the JSON-LD catalogue is loaded (`mergeHomininCertainty()`). Tests serve `app/` over HTTP so `fetch` works.

### Certainty levels for pigmentation

| Value | Meaning |
|-------|---------|
| `dna-direct` | Direct ancient DNA with sequenced MC1R, SLC genes etc. |
| `genetic` | Genetic inference from related populations or statistical modelling |
| `inference` | Morphological or ecological inference (e.g. equatorial latitude → dark skin) |
| `debate` | Actively debated, multiple positions in the literature |

---

## EVENTS_DATA — Array of milestone objects

```js
{
  id:       String,   // Unique slug, e.g. "fire-use", "lascaux-art"
  time:     Number,   // Years BP as negative integer, e.g. -400000
  label:    String,   // Short label for the timeline band marker
  icon:     String,   // Emoji, e.g. "🔥", "🗿", "🎨"
  color:    String,   // Hex color for the marker (matches CATEGORY_COLORS)
  desc:     String,   // Full description shown in tooltip
  category: String,   // "tools" | "fire" | "phylo" | "symbolic" | "art" | "migration" | "neolithic"
  lat:      Number,   // Latitude of the key discovery site
  lng:      Number,   // Longitude
  source:   String    // DOI or journal citation, e.g. "Nature 547 (2017)"
}
```

### Categories

| Category | Colour | Examples |
|----------|--------|---------|
| `tools` | #A07820 | Lomekwi tools, Acheulean biface, Levallois |
| `fire` | #E06020 | Fire use >1 Ma, intentional fire-making |
| `phylo` | #805090 | Phylogenetic divergence events |
| `symbolic` | #C0A000 | Ochre use, beads, intentional burial |
| `art` | #8050C0 | Cave art, Sulawesi hand stencils, Lascaux |
| `migration` | #208060 | Out of Africa events, peopling of Australia/Americas |
| `neolithic` | #60A040 | Domestication, agriculture, herding |

---

## SKIN_PERIODS — Array of skin tone band segments

```js
{
  start:    Number,   // Years BP as negative integer
  end:      Number,   // Years BP as negative integer (must be > start)
  color:    String,   // CSS hex or rgb color for the band segment
  cssClass: String,   // "" | "fur" | "partial-fur" — adds texture overlay
  label:    String,   // Short label
  tip:      String    // Tooltip text with source
}
```

The array must be sorted by ascending `start` (oldest first, most negative first).

---

## LANE_ASSIGNMENTS — Species lane mapping

```js
{
  "species-id": Number  // Integer 0–4, the vertical lane in the timeline
}
```

There are 5 lanes (0–4). Multiple species can share a lane only if their time ranges do not overlap. Check before assigning.

Current assignments:
```
Lane 0: afarensis, garhi, boisei
Lane 1: habilis, rudolfensis, georgicus
Lane 2: erectus, antecessor
Lane 3: heidelbergensis, neanderthal, denisova
Lane 4: sapiens
```

---

## Adding a new species — checklist

- [ ] Add entry to `SPECIES_DATA` array in `app/index.html`
- [ ] Add entry to `LANE_ASSIGNMENTS` (check for time range overlap)
- [ ] Add entry to `data/Hominines-Tableau-morphologique-et-pigmentation-complet-2026.md`
- [ ] All pigmentation claims have DOI
- [ ] All migration paths use `[lat, lng]` format (not `[lng, lat]`)
- [ ] Run `node tests/run-all.js` — unit tests will catch missing fields

## Adding a new milestone event — checklist

- [ ] Add entry to `EVENTS_DATA` array in `app/index.html`
- [ ] Add entry to `data/Chronologie-prehistorique-Tableau-de-reference-scientifique-2026.md`
- [ ] `time` is a negative integer (years BP)
- [ ] `source` contains a verifiable DOI
- [ ] Run `node tests/run-all.js`
