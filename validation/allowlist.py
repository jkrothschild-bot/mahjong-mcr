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
# Root cause J (their_bug) — docs/rules/decisions.md #20. PyMahjongGB's
# calculate_honors_and_knitted_tiles additionally sets KNITTED_STRAIGHT
# whenever LESSER_HONORS_AND_KNITTED_TILES fires AND the hand's suited-tile
# count is exactly 9 (fan_calculator.cpp: "if (numbered_cnt == 9) {
# fan_table[KNITTED_STRAIGHT] = 1; }") — i.e. PyMahjongGB stacks Knitted
# Straight onto ANY Lesser Honors hand with a 5/9 honor/suit split, even
# though that hand has NO pair and NO extra pung/chow (structurally the
# no-pair 14-singles shape, fans 20/34's shape). Rules-lawyer verification
# (docs/rules/decisions.md #20) directly quotes §3.8.1/App.1 p.34's fan 35
# text ("a special Straight... 3 different Knitted sequences" standing in
# for 3 of the STANDARD 4 sets) and a worked example captioned "Combined
# with Tile Hog" — impossible under a no-duplicate, no-pair shape — as clear
# evidence Knitted Straight requires the pair+extra-set structure our engine
# implements. PyMahjongGB's bonus stacking for the coincidental 9-suited-
# tile case is not supported by the rulebook text.
KNITTED_STRAIGHT_BONUS_STACK_NAMES = {"Lesser Honors and Knitted Tiles", "Knitted Straight"}

# ---------------------------------------------------------------------------
# Root cause K (ambiguity) — docs/rules/decisions.md #13, already-provisional,
# now observed diverging in practice (found via targeted-34's own win-
# circumstance randomization). Fan 46 "Out with Replacement Tile"'s first
# clause is textually identical to fan 45 "Last Tile Claim"'s entire
# definition (both: winning off the literal last discard of the game); our
# engine's detectOutWithReplacementTile (fans-8.ts) fires 46 whenever that
# happens, treating the overlap as a genuine rulebook redundancy that stacks
# (45+46 = 16 pts for winning on the game's last discard). PyMahjongGB's
# adjust_by_win_flag instead gates fan 46 ONLY on WIN_FLAG_ABOUT_KONG (a
# completely separate flag from WIN_FLAG_WALL_LAST, which alone drives fan
# 45/44) — i.e. it never stacks 46 onto a plain last-discard win at all.
# decisions.md #13 already flagged this exact scenario as "revisit if this
# combination ever looks wrong in practice" — this is that revisit; still
# provisional pending a rulebook-only resolution, not changed here.
LAST_DISCARD_OVERLAP_NAMES = {"Out with Replacement Tile"}

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


CATEGORY_PRIORITY = {"our_bug": 0, "ambiguity": 1, "their_bug": 2}

# Every known pattern, as (category, citation, family-of-names). A hand can
# trip more than one pattern at once (e.g. targeted-34 hits both the Knitted
# Straight bonus-stack quirk AND the Last-Discard-overlap ambiguity
# simultaneously) — classify_mismatch below peels matched names off the diff
# iteratively rather than requiring a single family to explain everything.
ALL_PATTERNS: list[tuple[str, str, frozenset[str]]] = [
    ("ambiguity", "docs/rules/decisions.md #11 — discard/robKong-completed pung concealment", frozenset(CONCEALMENT_FAMILY)),
    (
        "their_bug",
        "docs/rules/decisions.md #20 — PyMahjongGB stacks Knitted Straight onto any 9-suited-tile Lesser Honors hand; not supported by §3.8.1/App.1 p.34's text",
        frozenset(KNITTED_STRAIGHT_BONUS_STACK_NAMES),
    ),
    (
        "ambiguity",
        "docs/rules/decisions.md #13 — Last Tile Claim / Out with Replacement Tile textual overlap, provisional; PyMahjongGB gates fan 46 on isAboutKong only, never on a plain last-discard win",
        frozenset(LAST_DISCARD_OVERLAP_NAMES),
    ),
    *(("our_bug", citation, family) for citation, family in OUR_BUG_FAMILIES),
]


def classify_mismatch(our_fans: Counter, pmgb_fans: Counter) -> Classification | None:
    only_ours = set((our_fans - pmgb_fans).keys())
    only_pmgb = set((pmgb_fans - our_fans).keys())
    all_diff_names = only_ours | only_pmgb

    if not all_diff_names:
        # Fan multisets match exactly; a points-only mismatch here can only
        # be the point-value divergence.
        if our_fans.keys() & POINT_VALUE_DIVERGENT_NAMES:
            return Classification("their_bug", "fan-map.json _pointValueDivergence — Two Concealed Kongs: ours 8pts (§3.8.1) vs PyMahjongGB 6pts")
        return None

    remaining = set(all_diff_names)
    matched: list[tuple[str, str]] = []  # (category, citation)
    changed = True
    while changed and remaining:
        changed = False
        for category, citation, family in ALL_PATTERNS:
            covered = remaining & family
            if covered:
                remaining -= covered
                matched.append((category, citation))
                changed = True

    if remaining or not matched:
        return None

    matched.sort(key=lambda m: CATEGORY_PRIORITY[m[0]])
    best_category = matched[0][0]
    citations = ", ".join(dict.fromkeys(c for _cat, c in matched))  # de-duplicated, order-preserved
    return Classification(best_category, citations)
