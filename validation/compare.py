#!/usr/bin/env python3
"""KICKOFF-validation-harness.md Stage 1's Python half: reads every
validation/cases/<seed>.json file this run's `npm run generate` produced,
re-scores each hand with PyMahjongGB, and compares against the TypeScript
engine's own scoreHand output already recorded in the case file.

Compares at TWO levels, reported separately (1c):
  - total basicPoints
  - the exact fan multiset (by name, via fan-map.json's join table)

Known, cited divergences (docs/rules/decisions.md rulings the harness
correctly predicts every time) are read from validation/allowlist.py and
excluded from the "unexplained mismatch" tally — but always counted and
reported, never silently dropped. See run_report()'s output and README.md
for the exact command.
"""
from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from MahjongGB import MahjongFanCalculator

from allowlist import Classification, classify_mismatch

HERE = Path(__file__).parent
FAN_MAP_PATH = HERE / "fan-map.json"
CASES_DIR = HERE / "cases"


def load_fan_map() -> tuple[dict[int, str], dict[str, int], dict[int, int]]:
    data = json.loads(FAN_MAP_PATH.read_text(encoding="utf-8"))
    entries = data["entries"]
    id_to_pmgb = {e["id"]: e["pymahjonggbName"] for e in entries}
    pmgb_to_id = {e["pymahjonggbName"]: e["id"] for e in entries}
    id_to_points = {e["id"]: e["ourPoints"] for e in entries}
    if len(id_to_pmgb) != 81:
        raise SystemExit(f"fan-map.json must have 81 entries, has {len(id_to_pmgb)}")
    return id_to_pmgb, pmgb_to_id, id_to_points


ID_TO_PMGB_NAME, PMGB_NAME_TO_ID, ID_TO_POINTS = load_fan_map()

# PyMahjongGB 1.3.0 optionally compiles in an 82nd fan, "Concealed Kong and
# Melded Kong" (明暗杠, gated behind its own SUPPORT_CONCEALED_KONG_AND_MELDED_KONG
# #if in fan_calculator.h), that has no counterpart anywhere in the official
# 81-fan MCR table docs/rules/mcr_EN.pdf defines and this engine's
# FAN_REGISTRY implements. Confirmed via fan_calculator.cpp's calculate_kongs:
# whenever a hand has exactly 1 concealed kong + 1 melded kong, this fan
# REPLACES (not adds to) what would otherwise be separate "Concealed Kong"
# (67, 2pts) + "Melded Kong" (74, 1pt) credit. So it can't just be dropped —
# doing that silently loses 3 points of legitimate, official-table credit
# every time it fires and produces a false "unexplained" mismatch (this
# engine correctly scores both real fans independently, since it has no
# notion of this combo fan at all). Instead it's translated back into the
# two official fans it stands in for, at their official point values, before
# any comparison happens — see translate_pmgb_result below.
PYMAHJONGGB_COMBO_KONG_FAN_NAME = "Concealed Kong and Melded Kong"


@dataclass
class CaseResult:
    seed: int
    label: str
    our_points: int
    pmgb_points: int
    our_fans: Counter
    pmgb_fans: Counter
    error: str | None = None

    @property
    def points_match(self) -> bool:
        return self.error is None and self.our_points == self.pmgb_points

    @property
    def fans_match(self) -> bool:
        return self.error is None and self.our_fans == self.pmgb_fans


def our_fans_as_names(fan_matches: list[dict[str, Any]]) -> Counter:
    counter: Counter = Counter()
    for m in fan_matches:
        name = ID_TO_PMGB_NAME.get(m["fanId"])
        if name is None:
            raise SystemExit(f"our fanId {m['fanId']} is not in fan-map.json — map is not total")
        counter[name] += m["count"]
    return counter


def translate_pmgb_result(result: tuple) -> list[tuple[int, int, str]]:
    """Normalizes PyMahjongGB's raw (fan_point, cnt, name_zh, name_en) tuples
    to the official 81-fan table: expands the combo kong fan back into its
    two official components (see PYMAHJONGGB_COMBO_KONG_FAN_NAME's comment).
    Returns (points, count, name_en) triples."""
    out: list[tuple[int, int, str]] = []
    for fan_point, cnt, _name_zh, name_en in result:
        if name_en == PYMAHJONGGB_COMBO_KONG_FAN_NAME:
            out.append((ID_TO_POINTS[PMGB_NAME_TO_ID["Concealed Kong"]], cnt, "Concealed Kong"))
            out.append((ID_TO_POINTS[PMGB_NAME_TO_ID["Melded Kong"]], cnt, "Melded Kong"))
            continue
        out.append((fan_point, cnt, name_en))
    return out


def pmgb_fans_as_names(normalized: list[tuple[int, int, str]]) -> Counter:
    counter: Counter = Counter()
    for _fan_point, cnt, name_en in normalized:
        if name_en not in PMGB_NAME_TO_ID:
            raise SystemExit(
                f"PyMahjongGB returned fan name {name_en!r} which is not in fan-map.json's 81 entries — "
                "map is not total (KICKOFF-validation-harness.md 1c)"
            )
        counter[name_en] += cnt
    return counter


def score_one(case: dict[str, Any]) -> CaseResult:
    p = case["pmgb"]
    pack = tuple(tuple(x) for x in p["pack"])
    hand = tuple(p["hand"])
    try:
        result = MahjongFanCalculator(
            pack=pack,
            hand=hand,
            winTile=p["winTile"],
            flowerCount=p["flowerCount"],
            isSelfDrawn=p["isSelfDrawn"],
            is4thTile=p["is4thTile"],
            isAboutKong=p["isAboutKong"],
            isWallLast=p["isWallLast"],
            seatWind=p["seatWind"],
            prevalentWind=p["prevalentWind"],
            verbose=True,
        )
    except Exception as e:  # noqa: BLE001 - PyMahjongGB raises bare strings/TypeError
        return CaseResult(case["seed"], case["label"], case["ours"]["basicPoints"], -1, Counter(), Counter(), error=str(e))

    normalized = translate_pmgb_result(result)
    pmgb_fans = pmgb_fans_as_names(normalized)
    pmgb_points = sum(fan_point * cnt for fan_point, cnt, _name_en in normalized)
    our_fans = our_fans_as_names(case["ours"]["fanMatches"])
    return CaseResult(case["seed"], case["label"], case["ours"]["basicPoints"], pmgb_points, our_fans, pmgb_fans)


def iter_cases(cases_dir: Path):
    files = sorted(cases_dir.glob("*.json"))
    if not files:
        raise SystemExit(f"No case files in {cases_dir} — run `npm run generate --workspace=@mahjong-mcr/validation` first")
    for path in files:
        payload = json.loads(path.read_text(encoding="utf-8"))
        for case in payload["cases"]:
            yield case


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cases-dir", default=str(CASES_DIR))
    parser.add_argument("--json-report", default=None, help="also write a machine-readable report to this path")
    args = parser.parse_args()

    cases = list(iter_cases(Path(args.cases_dir)))
    results = [score_one(c) for c in cases]

    total = len(results)
    points_mismatches = [r for r in results if not r.points_match]
    fan_mismatches = [r for r in results if not r.fans_match]
    any_mismatch = [r for r in results if not (r.points_match and r.fans_match)]

    by_category: dict[str, list[tuple[CaseResult, Classification]]] = {"their_bug": [], "ambiguity": [], "our_bug": []}
    unexplained: list[CaseResult] = []
    for r in any_mismatch:
        entry = classify_mismatch(r.our_fans, r.pmgb_fans)
        if entry is not None:
            by_category[entry.category].append((r, entry))
        else:
            unexplained.append(r)

    fans_covered = set()
    for r in results:
        fans_covered.update(r.our_fans.keys())
    fan_ids_covered = sorted(PMGB_NAME_TO_ID[n] for n in fans_covered)
    all_ids = set(range(1, 82))
    uncovered = sorted(all_ids - set(fan_ids_covered))

    print("=== KICKOFF-validation-harness.md Stage 1 comparison report ===")
    print(f"hands compared: {total}")
    print(f"points mismatches: {len(points_mismatches)} ({len(points_mismatches) / total:.1%})")
    print(f"fan-multiset mismatches: {len(fan_mismatches)} ({len(fan_mismatches) / total:.1%})")
    print(f"  - their_bug (PyMahjongGB-specific, allowlisted): {len(by_category['their_bug'])}")
    print(f"  - ambiguity (docs/rules/decisions.md provisional ruling): {len(by_category['ambiguity'])}")
    print(f"  - our_bug (confirmed, fixture committed, fix pending — see citations): {len(by_category['our_bug'])}")
    print(f"  - UNCLASSIFIED (needs triage): {len(unexplained)}")
    print(f"fans exercised (>=1 hand): {len(fan_ids_covered)}/81")
    if uncovered:
        names = [ID_TO_PMGB_NAME[i] for i in uncovered]
        print(f"NOT exercised: {uncovered}")
        for i, n in zip(uncovered, names):
            print(f"    {i}: {n}")

    our_bug_citations = Counter(c.citation for _r, c in by_category["our_bug"])
    if our_bug_citations:
        print("\n--- our_bug breakdown (fixture already committed, fix is separate follow-up work) ---")
        for citation, count in our_bug_citations.most_common():
            print(f"  {count:4d}x  {citation}")

    if unexplained:
        print("\n--- UNCLASSIFIED mismatches (need triage) ---")
        for r in unexplained[:50]:
            print(f"seed={r.seed} label={r.label} ours={r.our_points} pmgb={r.pmgb_points}")
            print(f"    ours only: {dict(r.our_fans - r.pmgb_fans)}")
            print(f"    pmgb only: {dict(r.pmgb_fans - r.our_fans)}")

    if args.json_report:
        report = {
            "total": total,
            "pointsMismatches": len(points_mismatches),
            "fanMismatches": len(fan_mismatches),
            "theirBug": len(by_category["their_bug"]),
            "ambiguity": len(by_category["ambiguity"]),
            "ourBug": len(by_category["our_bug"]),
            "ourBugBreakdown": dict(our_bug_citations),
            "unclassified": len(unexplained),
            "fansCovered": fan_ids_covered,
            "fansUncovered": uncovered,
            "unclassifiedDetail": [
                {
                    "seed": r.seed,
                    "label": r.label,
                    "ours": r.our_points,
                    "pmgb": r.pmgb_points,
                    "oursOnly": dict(r.our_fans - r.pmgb_fans),
                    "pmgbOnly": dict(r.pmgb_fans - r.our_fans),
                }
                for r in unexplained
            ],
            "ourBugDetail": [
                {
                    "seed": r.seed,
                    "label": r.label,
                    "ours": r.our_points,
                    "pmgb": r.pmgb_points,
                    "oursOnly": dict(r.our_fans - r.pmgb_fans),
                    "pmgbOnly": dict(r.pmgb_fans - r.our_fans),
                    "citation": c.citation,
                }
                for r, c in by_category["our_bug"]
            ],
        }
        Path(args.json_report).write_text(json.dumps(report, indent=2), encoding="utf-8")

    return 1 if unexplained else 0


if __name__ == "__main__":
    sys.exit(main())
