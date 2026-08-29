# Documentation index

Read in this order. Only the first two documents describe current policy.

| Document | Status | What it is for |
|----------|--------|----------------|
| [`DATA_LINEAGE.md`](DATA_LINEAGE.md) | **Living** | How scientific knowledge travels through the repository: the three data layers, which one is authoritative for what, the sync commands, and the safeguards in place. Start here for anything about data flow. |
| [`scientific-references.md`](scientific-references.md) | **Living** | Curated bibliography grouped by topic. Every DOI resolves and matches its stated author and title. |
| [`ROADMAP.md`](ROADMAP.md) | **Living** | Planned and completed work. |
| [`DATA_LINEAGE_AUDIT.md`](DATA_LINEAGE_AUDIT.md) | **Historical** | A pre-migration snapshot, written while the French working tables were still the editorial primary. Useful to understand how the current structure was arrived at. **Its path inventories and migration plans are not current policy** — several of its findings have since been implemented, and the files it inventories no longer exist. |

## Elsewhere in the repository

| Location | What you will find |
|----------|--------------------|
| [`../data/README.md`](../data/README.md) | Entry point for the science: which reference document to read first, how the summary table works, which layer wins when two disagree. |
| [`../.ai-context/data-schema.md`](../.ai-context/data-schema.md) | Field-by-field data dictionary: every JSON-LD key, its runtime counterpart, and the allowed values of every enum. |
| [`../.ai-context/CONTEXT.md`](../.ai-context/CONTEXT.md) | Architecture, the project tree, what not to change and why. |
| [`../CONTRIBUTING.md`](../CONTRIBUTING.md) | How to propose a data update, a translation, or a code change. |
