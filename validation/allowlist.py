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
#
# RESOLVED (docs/rules/decisions.md #33, 2026-08-06): "Two Concealed Pungs"
# in this family was OVERBROAD for a while — detectTwoConcealedPungs
# (fans-2.ts) had its own separate our_bug (filtered `s.kind === 'pung'`,
# wrongly excluding concealed kongs from its count; see App.1 p.40's own
# worked example for fan 66, which combines a concealed pung + a concealed
# kong to reach "two") that produced the identical fan-name diff signature
# as a genuine item #11 concealment-completion mismatch, so classify_mismatch
# couldn't tell them apart and everything fell into this ambiguity family.
# Now that the detector is fixed, this family's own count dropped by ~25
# hands in the same harness re-run that confirmed the fix (219 -> 194) —
# direct evidence of how much it had been hiding. No longer flagged as
# overbroad; the remaining count is genuinely item #11 only.
CONCEALMENT_FAMILY = {
    "Four Concealed Pungs", "Three Concealed Pungs", "Two Concealed Pungs",
    "Concealed Hand", "Concealed Kong", "Two Concealed Kongs",
    "All Pungs", "Melded Kong", "Two Melded Kongs",
}

# ---------------------------------------------------------------------------
# Root cause C (their_bug, CONFIRMED 2026-08-05 — docs/rules/decisions.md
# #21). "Two Concealed Kongs" fires on both sides but at different point
# values (ours 8, PyMahjongGB 6). Directly verified against mcr_EN.pdf via
# rules-lawyer: §3.8.1 p.16's summary table AND Appendix 1 p.37 both give
# fan 48 exactly 8 points, in the same tier as Chicken Hand/Last Tile Draw/
# Last Tile Claim/Out with Replacement Tile/Robbing The Kong — matching
# registry.ts exactly. PyMahjongGB's 6-point figure describes the rulebook's
# ACTUAL 6-point tier (fans 49-54: All Pungs/Half Flush/Mixed Shifted Chows/
# All Types/Melded Hand/Two Dragons Pungs) — a mismap on their side, not a
# rulebook ambiguity. No engine change; registry.ts's 8 points is correct.
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
# our_bug families — confirmed engine bugs, each with a permanent fixture
# already committed, kept here only until fixed (then removed, confirmed
# zero-match first). Empty as of docs/rules/decisions.md #33 (2026-08-06):
# all 6 distinct our_bug causes found in Step 4/5 (item #30(b)-(f)) are now
# fixed. The NEXT entry added here should come with a real citation in
# exclusion-citations.ts if it's an exclusions.ts change (the guard requires
# it) — see that file's header comment.
OUR_BUG_FAMILIES: list[tuple[str, frozenset[str]]] = []


# ---------------------------------------------------------------------------
# Root cause L (their_bug, CONFIRMED 2026-08-06 — docs/rules/decisions.md
# #32, the item #23 revert). PyMahjongGB's adjust_fan_table downgrades Fully
# Concealed Hand (56) to plain Self-Drawn for Nine Gates (4) / Four Concealed
# Pungs (12), and its calculate_special_form_fan path never sets Fully
# Concealed Hand at all for Seven Shifted Pairs (6) / Thirteen Orphans (7) /
# Seven Pairs (19) — directly contradicting mcr_EN.pdf's own §3.8.1 primary
# fan table, which explicitly annotates all five of those fans with "(Fully
# Concealed may be combined if Self-Drawn)". decisions.md #23 previously
# "fixed" our engine to match this PyMahjongGB behavior with no independent
# citation; #32 reverted that. This family exists for the OPPOSITE direction
# from OUR_BUG_FAMILIES's concealed-kong entry below: here OUR side correctly
# has "Fully Concealed Hand" and PyMahjongGB doesn't. Distinguishing these
# two by fan-name diff alone is not possible (both produce a
# {"Fully Concealed Hand", "Self-Drawn"}-shaped diff) — classify_mismatch
# below disambiguates by checking whether any of these five shape names
# appear in the hand's full fan set (not just the diff), since the
# concealed-kong bug is shape-independent and these five names only ever
# appear together with a Fully-Concealed-Hand divergence when this specific
# PyMahjongGB gap is the cause.
FULLY_CONCEALED_COMBINES_SHAPE_NAMES = {
    "Nine Gates", "Seven Shifted Pairs", "Thirteen Orphans", "Four Concealed Pungs", "Seven Pairs",
}
FULLY_CONCEALED_COMBINES_CITATION = (
    "docs/rules/decisions.md #32 — PyMahjongGB never awards Fully Concealed Hand alongside Nine Gates/Seven Shifted "
    "Pairs/Thirteen Orphans/Four Concealed Pungs/Seven Pairs on a self-drawn win, contradicting §3.8.1's own explicit "
    "\"(Fully Concealed may be combined if Self-Drawn)\" annotation for all five fans. Confirmed by direct PDF read, "
    "not just rules-lawyer; this is the corrected direction of the reverted item #23."
)

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

    # Root cause L special-case (see its own comment above): must run BEFORE
    # the generic peeling loop, since it needs to see the full our_fans set
    # (whether one of the 5 shape names is present at all), not just the
    # diff — and it must take priority over OUR_BUG_FAMILIES's concealed-kong
    # entry for these hands specifically, even though `our_bug` normally
    # outranks `their_bug`, because this diff shape is genuinely ambiguous
    # between the two causes and the shape-name check is how we know which
    # one actually applies to THIS hand.
    if all_diff_names <= {"Fully Concealed Hand", "Self-Drawn"} and "Fully Concealed Hand" in only_ours:
        if our_fans.keys() & FULLY_CONCEALED_COMBINES_SHAPE_NAMES:
            return Classification("their_bug", FULLY_CONCEALED_COMBINES_CITATION)

    if not all_diff_names:
        # Fan multisets match exactly; a points-only mismatch here can only
        # be the point-value divergence.
        if our_fans.keys() & POINT_VALUE_DIVERGENT_NAMES:
            return Classification("their_bug", "docs/rules/decisions.md #21 — Two Concealed Kongs: ours 8pts confirmed correct (§3.8.1 p.16 / App.1 p.37), PyMahjongGB's 6pts describes a different fan's tier")
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
