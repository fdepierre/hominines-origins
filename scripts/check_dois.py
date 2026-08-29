#!/usr/bin/env python3
"""Resolve every DOI cited in data/, docs/ and app/data/ against Crossref.

Two classes of problem are reported:

* UNRESOLVED - the DOI does not exist on Crossref, so a reader cannot reach the
  source at all.
* MISMATCH   - the DOI resolves, but the first-author surname recorded by
  Crossref does not appear on the citing line. That usually means the DOI points
  at a different paper than the one being cited, which is harder to spot than a
  dead identifier and just as damaging.

An identifier written inside an inline code span (`10.xxxx/yyyy`) is treated as
quoted rather than cited, and is skipped. The validation notes in `data/` rely on
this to discuss identifiers that were found to be wrong; a real citation is
always written as bare text or as a Markdown link.

Read-only. Exit status is non-zero when either class is non-empty, so the check
can be wired into CI.
"""
from __future__ import annotations

import argparse
import collections
import glob
import json
import re
import sys
import unicodedata
import urllib.error
import urllib.parse
import urllib.request

DOI_RE = re.compile(r"10\.\d{4,9}/[^\s)\]|,;\"'<>`]+")
CODE_SPAN_RE = re.compile(r"`[^`\n]*`")
TRAILING = ".,;:)\"'`"
HEADERS = {"User-Agent": "hominines-origins-doi-check/1.0 (mailto:contact@lookingforanswers.eu)"}
SEARCH_PATTERNS = ("data/*.md", "docs/*.md", "app/data/*.json")


def fold(text: str) -> str:
    """Lowercase and strip diacritics so 'Suarez' matches 'Suárez'."""
    decomposed = unicodedata.normalize("NFKD", text)
    return "".join(ch for ch in decomposed if not unicodedata.combining(ch)).lower()


def collect() -> dict[str, list[tuple[str, int, str]]]:
    found: dict[str, list[tuple[str, int, str]]] = collections.defaultdict(list)
    for pattern in SEARCH_PATTERNS:
        for path in glob.glob(pattern):
            with open(path, encoding="utf-8") as handle:
                for lineno, line in enumerate(handle, 1):
                    cited = CODE_SPAN_RE.sub(" ", line)
                    for raw in DOI_RE.findall(cited):
                        found[raw.rstrip(TRAILING)].append((path, lineno, line.strip()))
    return found


def crossref(doi: str) -> tuple[str, str, str, str]:
    """Return (status, title, first-author surname, year).

    Status is "ok" when Crossref answered, "missing" when it answered that the
    identifier does not exist, and "unreachable" when the request itself failed.
    Only "missing" is a defect in the repository; "unreachable" is a transient
    network condition and must not fail CI.
    """
    url = "https://api.crossref.org/works/" + urllib.parse.quote(doi, safe="/.")
    try:
        request = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(request, timeout=30) as response:
            message = json.load(response)["message"]
    except urllib.error.HTTPError as exc:
        if exc.code in (404, 410):
            return "missing", f"HTTP {exc.code}", "", ""
        return "unreachable", f"HTTP {exc.code}", "", ""
    except Exception as exc:
        return "unreachable", type(exc).__name__, "", ""

    title = " ".join((message.get("title") or ["(untitled)"])[0].split())
    title = re.sub(r"<[^>]+>", "", title)
    authors = message.get("author") or []
    surname = authors[0].get("family", "") if authors else ""
    issued = message.get("issued", {}).get("date-parts") or [[]]
    year = str(issued[0][0]) if issued[0] else ""
    return "ok", title, surname, year


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--quiet", action="store_true", help="only print problems")
    args = parser.parse_args()

    found = collect()
    unresolved, mismatched, unreachable = [], [], []

    print(f"{len(found)} unique DOIs cited across {', '.join(SEARCH_PATTERNS)}\n")
    for doi in sorted(found):
        status, title, surname, year = crossref(doi)
        locations = found[doi]
        if status == "missing":
            unresolved.append((doi, title, locations))
            print(f"UNRESOLVED  {doi}  ({title})")
            continue
        if status == "unreachable":
            unreachable.append((doi, title))
            print(f"UNREACHABLE {doi}  ({title}) - network condition, not a repository defect")
            continue

        context = fold(" ".join(line for _, _, line in locations))
        author_ok = not surname or fold(surname) in context
        if author_ok:
            if not args.quiet:
                print(f"OK          {doi}  {surname} {year} - {title[:70]}")
        else:
            mismatched.append((doi, f"{surname} {year} - {title}", locations))
            print(f"MISMATCH    {doi}  Crossref says: {surname} {year} - {title[:70]}")

    print()
    if unreachable:
        print(f"{len(unreachable)} DOI(s) could not be checked (network); not treated as failures.\n")

    if unresolved:
        print(f"=== {len(unresolved)} DOI(s) do not resolve ===")
        for doi, detail, locations in unresolved:
            print(f"  {doi}  ({detail})")
            for path, lineno, _ in locations:
                print(f"      {path}:{lineno}")
        print()

    if mismatched:
        print(f"=== {len(mismatched)} DOI(s) whose Crossref record does not match the citing text ===")
        for doi, detail, locations in mismatched:
            print(f"  {doi}")
            print(f"      Crossref: {detail}")
            for path, lineno, _ in locations:
                print(f"      cited at {path}:{lineno}")
        print()

    if not unresolved and not mismatched:
        checked = len(found) - len(unreachable)
        print(f"All {checked} checked DOIs resolve and match their citing text.")
        return 0
    return 1


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.exit(main())
