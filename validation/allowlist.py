"""KICKOFF-validation-harness.md 1d/1e: the known-divergence record and
triage classifier for every mismatch this harness finds between this
engine's scoreHand and PyMahjongGB 1.3.0.

Per 1e's triage protocol, every mismatch is classified into exactly one of:
  - 'their_bug'  — PyMahjongGB's own implementation choice (or a
    non-standard extension), cited to its source. Would be allowlisted
    permanently even after any future engine fix.
  - 'ambiguity'  — a docs/rules/decisions.md provisional ruling that
    PyMahjongGB happens to implement differently; NOT changed here without
    a rulebook citation (KICKOFF-validation-harness.md 1e: "Do not 'fix'
    the engine to match PyMahjongGB without a rulebook citation").
  - 'our_bug'    — a confirmed engine bug. Per CLAUDE.md, each of these has
    a permanent failing-by-design test fixture already committed (see the
    file/line cited in each entry below) BEFORE this classifier existed;
    the actual fix is deliberately a separate, later commit. These are
    NEVER silently hidden — classify_mismatch still reports them, just
    tagged 'our_bug' instead of left as a mystery, satisfying "every
    mismatch triaged to a category — none left as 'unknown'" without
    pretending the harness is fully green.
  - None         — genuinely unclassified; needs further triage.

NEVER add an entry without a citation. This file is the honest record of
where we know we differ (and why), not a place to hide unexplained
failures.
"""
from __future__ import annotations

from collections import Counter
from dataclasses import dataclass


@dataclass(frozen=True)
class Classification:
    category: str  # 'their_bug' | 'ambiguity' | 'our_bug'
    citation: str


# ---------------------------------------------------------------------------
# Root cause A (ambiguity) — docs/rules/decisions.md #11.
#
# PyMahjongGB (fan_calculator.cpp, the "点和的牌张，如果不能解释为顺子中的一张，
# 那么将其解释为刻子，并标记这个刻子为明刻" comment in calculate_basic_form_fan)
# marks a pung as EXPOSED for scoring purposes whenever it's completed by a
# discard/robbed-kong win specifically via that pung (not a chow) — the
# common "a triplet completed by ron isn't concealed" convention from other
# mahjong rule families. This engine's decisions.md #11 provisional ruling
# says the opposite: a pung completed by the winning tile (self-draw OR
# discard) still counts as concealed, because no MCR rulebook passage was
# found addressing this specific nuance either way. Every fan below can
# shift value depending on which side of this one rule a hand lands on —
# NOT six separate ambiguities, just this one propagating through the
# concealed-pung/kong-counting family of fans.
CONCEALMENT_FAMILY = {
    "Four Concealed Pungs", "Three Concealed Pungs", "Two Concealed Pungs",
    "Concealed Hand", "Concealed Kong", "Two Concealed Kongs",
    "All Pungs", "Melded Kong", "Two Melded Kongs",
}

# ---------------------------------------------------------------------------
# Root cause C (their_bug, scoped out) — fan-map.json's
# _pointValueDivergence: "Two Concealed Kongs" fires on both sides but at
# different point values (ours 8 per registry.ts's own point tier, citing
# §3.8.1; PyMahjongGB 6). Not yet triaged against mcr_EN.pdf directly (see
# fan-map.json) — filed as 'their_bug' provisionally since our own
# registry.ts already cites a rulebook section for its value and PyMahjongGB
# is "a second opinion, not an oracle" (KICKOFF-validation-harness.md 1e).
POINT_VALUE_DIVERGENT_NAMES = {"Two Concealed Kongs"}

# ---------------------------------------------------------------------------
# Root causes B/D/E/F/H (our_bug) — confirmed engine bugs, each with a
# permanent fixture already committed. Fix is separate/later work per
# CLAUDE.md's triage protocol; these entries exist so the report can label
# them "known, tracked" instead of "unknown."
OUR_BUG_FAMILIES: list[tuple[str, frozenset[str]]] = [
    (
        "packages/engine/src/scoring/exclusions.test.ts — 'Prevalent/Seat Wind should exclude Pung of Terminals or Honors' "
        "(missing [60,73]/[61,73])",
        frozenset({"Prevalent Wind", "Seat Wind", "Pung of Terminals or Honors"}),
    ),
    (
        "packages/engine/src/scoring/exclusions.test.ts — 'Fully Concealed Hand should be excluded by fans requiring full "
        "concealment' (missing [4,56]/[6,56]/[7,56]/[12,56]/[19,56])",
        frozenset({"Fully Concealed Hand", "Self-Drawn"}),
    ),
    (
        "packages/engine/src/scoring/exclusions.test.ts — 'All Simples/Pure Terminal Chows should exclude No Honors' "
        "(missing [68,76]/[13,76])",
        frozenset({"No Honors"}),
    ),
    (
        "packages/engine/src/scoring/fans-2.test.ts — 'BUG: misses Tile Hog when the 4th copy comes from an exposed chow' "
        "(detectTileHog's meldTileTypeId misuse for chow melds)",
        frozenset({"Tile Hog"}),
    ),
    (
        "packages/engine/src/scoring/exclusions.test.ts — 'Out with Replacement Tile should exclude Self-Drawn' (missing [46,80])",
        frozenset({"Out with Replacement Tile", "Self-Drawn"}),
    ),
    (
        "packages/engine/src/scoring/exclusions.test.ts — 'All Green should exclude Half Flush and One Voided Suit' (fan 3 has no exclusion entries at all; missing [3,50]/[3,75])",
        frozenset({"Half Flush", "One Voided Suit"}),
    ),
]


def classify_mismatch(our_fans: Counter, pmgb_fans: Counter) -> Classification | None:
    only_ours = our_fans - pmgb_fans
    only_pmgb = pmgb_fans - our_fans
    all_diff_names = set(only_ours.keys()) | set(only_pmgb.keys())

    if not all_diff_names:
        # Fan multisets match exactly; a points-only mismatch here can only
        # be the point-value divergence.
        if our_fans.keys() & POINT_VALUE_DIVERGENT_NAMES:
            return Classification("their_bug", "fan-map.json _pointValueDivergence — Two Concealed Kongs: ours 8pts (§3.8.1) vs PyMahjongGB 6pts")
        return None

    if all_diff_names <= CONCEALMENT_FAMILY:
        return Classification("ambiguity", "docs/rules/decisions.md #11 — discard/robKong-completed pung concealment")

    for citation, family in OUR_BUG_FAMILIES:
        if all_diff_names <= family:
            return Classification("our_bug", citation)

    return None
