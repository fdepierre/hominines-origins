# Scientific data — start here

This folder holds the **editorial source of record** for the project: English
syntheses of the primary literature, written to be read, cited and corrected by
people rather than parsed by machines.

**Revisable editorial synthesis, not a certified scientific database. Primary
literature (DOI) remains the reference.**

If you have arrived to check a claim, correct a date, or understand how the
catalogue is organised, this page is the entry point.

---

## Which document should I read?

| Read this | When you want to know |
|-----------|-----------------------|
| [`Hominins-Morphology-Pigmentation.md`](Hominins-Morphology-Pigmentation.md) | What a taxon looked like: biometrics, morphology, skin / eye / hair pigmentation, the confidence attached to each claim, and the debates that are still open. |
| [`Prehistoric-Chronology-Scientific-Reference.md`](Prehistoric-Chronology-Scientific-Reference.md) | When something happened: tools, fire, art, burials, dispersals, domestication — each with its evidential basis and its disputes. |

Both files carry a **Last reviewed** date in their header and a reading
convention for their confidence symbols. Neither is a peer-reviewed publication
nor a certified scientific database; both are revisable editorial syntheses
that point at the primary sources.

For the bibliography behind them, see
[`../docs/scientific-references.md`](../docs/scientific-references.md).

---

## How the three data layers relate

```
primary literature (journals, DOI)
        │  manual
        ▼
data/*.md                 ← you are here: editorial source of record
        │  manual mirror (no automated generator)
        ▼
app/data/*.json           ← executable source of truth: what the app loads
        │  scripts/sync_embedded.py (one-way)
        ▼
app/index.html            ← derived offline mirror, never authoritative
```

**Which layer wins when they disagree?** `app/data/*.json` — it is what the
application and the test suite actually consume. The Markdown here wins on
*interpretation*: evidence type, debate status, wording of a caveat. The full
policy is in [`../docs/DATA_LINEAGE.md`](../docs/DATA_LINEAGE.md).

There is deliberately **no generator** from Markdown to JSON. A converter that
had to preserve epistemic status without ever strengthening or flattening it
does not exist here, and writing one is a separate design problem.
`scripts/check_md_json.py` only verifies that catalogue `id` values, DOI sets,
and debate/evidence tokens already match.

---

## How many species and milestones are there?

No document in this repository states a count, because any number written in
prose goes stale the next time the catalogue grows. To get the current figures:

```bash
python scripts/sync_embedded.py --check
```

It prints the authoritative species and milestone counts and confirms that the
offline mirrors match the JSON.

---

## How the morphology summary table is built

Near the end of `Hominins-Morphology-Pigmentation.md` there is a consolidated
table with one row per taxon or period. Read it as a **summary of the narrative
sections above it**, not as an independent dataset:

- `n/a` means the measurement is not applicable to the available material — for
  example a female estimate when only a male specimen is known.
- **Not documented** means the published record does not support a figure. It is
  not a gap waiting to be filled with an estimate.
- The **Confidence** column uses the four symbols defined in the document's
  reading convention: direct DNA, indirect genetics, evolutionary inference,
  open debate.
- One row, *H. sapiens* Present (global), has no counterpart in `app/data/`
  because the application's timeline stops at 2 ka.

---

## Field-by-field data dictionary

The Markdown here is prose. The structured schema — every JSON-LD key, its
runtime counterpart, and the allowed values of every enum — lives in
[`data-schema.md`](data-schema.md).

The two uncertainty axes carried by every species entry are documented at length
in the [project README](../README.md#scientific-uncertainty-framework):
`hominin:*DebateLevel` (how settled the debate is) and `hominin:*EvidenceType`
(what kind of evidence the claim rests on).

---

## Updating a claim

1. Edit the relevant file here: add the finding, its evidence type, the debate
   it affects, and a DOI. Bump **Last reviewed**.
2. Decide whether `app/data/species.json` or `app/data/events.json` must change,
   and mirror the substance — never the epistemic status alone.
3. Regenerate the offline mirrors: `python scripts/sync_embedded.py`.
4. Verify: `python scripts/check_md_json.py` then `python scripts/check_dois.py` then `node tests/run-all.js`.

**The non-negotiable rule:** conversion between layers may change format only.
It must never strengthen, simplify, infer, translate away, or silently discard
the epistemic status of a scientific claim.

Full contribution guidance: [`../CONTRIBUTING.md`](../CONTRIBUTING.md).

---

## A note on language

These documents are **English**. The JSON catalogue carries parallel `en` and
`fr` strings. The running application chrome is **English**; use **Translate
this page** for other UI languages. French scientific narrative is a bundled
JSON translation, switched with **Catalogue language** in the app. Editorial
Markdown is also opened from the app Sources drawer so a page translator can
localise it. Do not maintain a second French Markdown source of truth.

---

## Licence

Scientific data in this folder is published under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) — share and adapt with
attribution. The application code is MIT; see [`../LICENSE`](../LICENSE).
