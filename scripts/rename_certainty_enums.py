"""
One-off: rename French certainty enum tokens to English across repo files.
Run: python scripts/rename_certainty_enums.py
"""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Longest keys first to avoid partial collisions.
ENUM_PAIRS: list[tuple[str, str]] = [
    ("HYPOTHESE_SPECULATIVE", "SPECULATIVE_HYPOTHESIS"),
    ("NARRATIF_MEDIATIQUE", "MEDIA_NARRATIVE"),
    ("INFERENCE_EVOLUTIVE", "EVOLUTIONARY_INFERENCE"),
    ("DONNEES_INDIRECTES", "INDIRECT_DATA"),
    ("DONNEES_DIRECTES", "DIRECT_DATA"),
    ("CONSENSUS_MODERE", "MODERATE_CONSENSUS"),
    ("CONSENSUS_FORT", "STRONG_CONSENSUS"),
    ("EN_DEBAT_ACTIF", "ACTIVE_DEBATE"),
]

# CSS: semantic color vars + class names (English).
CSS_PAIRS: list[tuple[str, str]] = [
    ("--certainty-consensus-fort:", "--certainty-strong-consensus:"),
    ("--certainty-consensus-modere:", "--certainty-moderate-consensus:"),
    ("--certainty-debat-actif:", "--certainty-active-debate:"),
    ("--certainty-hypothese:", "--certainty-speculative:"),
    ("var(--certainty-consensus-fort)", "var(--certainty-strong-consensus)"),
    ("var(--certainty-consensus-modere)", "var(--certainty-moderate-consensus)"),
    ("var(--certainty-debat-actif)", "var(--certainty-active-debate)"),
    ("var(--certainty-hypothese)", "var(--certainty-speculative)"),
    (".certainty-tri-wedge--fort", ".certainty-tri-wedge--strong"),
    (".certainty-tri-wedge--modere", ".certainty-tri-wedge--moderate"),
    (".certainty-tri-wedge--debat", ".certainty-tri-wedge--active-debate"),
    (".certainty-tri-wedge--hypo", ".certainty-tri-wedge--speculative"),
    (".uncertainty-level-li--fort", ".uncertainty-level-li--strong"),
    (".uncertainty-level-li--modere", ".uncertainty-level-li--moderate"),
    (".uncertainty-level-li--debat", ".uncertainty-level-li--active-debate"),
    (".uncertainty-level-li--hypo", ".uncertainty-level-li--speculative"),
    # Switch/case return strings (already enum-replaced in same pass if order wrong — fixed below)
    ("'certainty-tri-wedge certainty-tri-wedge--fort'", "'certainty-tri-wedge certainty-tri-wedge--strong'"),
    ("'certainty-tri-wedge certainty-tri-wedge--modere'", "'certainty-tri-wedge certainty-tri-wedge--moderate'"),
    ("'certainty-tri-wedge certainty-tri-wedge--debat'", "'certainty-tri-wedge certainty-tri-wedge--active-debate'"),
    ("'certainty-tri-wedge certainty-tri-wedge--hypo'", "'certainty-tri-wedge certainty-tri-wedge--speculative'"),
]

FILES: list[str] = [
    "app/data/species.json",
    "app/data/events.json",
    "tests/unit.test.js",
    "README.md",
    ".ai-context/data-schema.md",
    "app/index.html",
]


def sub_all(text: str, pairs: list[tuple[str, str]]) -> str:
    for a, b in pairs:
        text = text.replace(a, b)
    return text


def main() -> None:
    for rel in FILES:
        path = ROOT / rel
        text = path.read_text(encoding="utf-8")
        text = sub_all(text, ENUM_PAIRS)
        if rel == "app/index.html":
            text = sub_all(text, CSS_PAIRS)
        path.write_text(text, encoding="utf-8")
        print("updated:", rel)


if __name__ == "__main__":
    main()
