// Phase 10 Stage 3 — whole-hand ROUTE compatibility between fan-targets.ts's
// 10 families. Exists because scoring/exclusions.ts's table is the WRONG
// tool for this question, not an incomplete version of the right one:
// exclusions.ts only ever needs an entry when two fans could naively co-fire
// on the same COMPLETE hand (the real per-fan detectors' own domain) — a
// pair that's simply IMPOSSIBLE together on any complete hand needs no
// entry there, because the real detectors just never co-fire and no
// resolution rule is required. fan-targets.ts's estimators don't have that
// luxury: running on an INCOMPLETE hand, two families can both report
// "in progress" for the SAME current tiles while pointing in genuinely
// contradictory directions — even though no complete hand could ever
// satisfy both. Two live instances of this were found by hand (Half Flush
// vs All Simples/No Honors: hints.ts's now-removed REQUIRES_HONOR_TILE/
// FORBIDS_HONOR_TILE sets; Seven Pairs vs All Pungs: hints.test.ts's own
// "filters shape-incompatible candidates" fixture) before this module
// existed to make the question exhaustive instead of accretive.
//
// Definition used throughout this table: a pair is ROUTE-COMPATIBLE iff
// some complete, legal MCR hand scores both. This is strictly WEAKER than
// "not excluded in exclusions.ts" — it includes pairs exclusions.ts DOES
// list (e.g. [22,76], [68,76], [2,59] — real detectors co-fire on a
// complete hand, exclusions.ts just resolves which one counts) alongside
// pairs it was never asked to cover. computeRouteToPoints (hints.ts) checks
// BOTH this table and areExclusive — this table for whether the
// UNDERLYING CONDITIONS can coexist at all, areExclusive for whether real
// scoring counts both once they do.
//
// Every pair among the 10 families (STAGE3_FAN_IDS below) is classified —
// 45 unordered pairs, C(10,2) — with no "compatible by omission" default.
// fan-target-compatibility.test.ts's completeness test enforces this
// directly: it fails if any pair lacks an explicit entry. Mirrors
// scoring/exclusion-citations.ts's own posture (every entry needs a real
// citation, not a bare "seems fine") but adapted for two-sided
// classification: an INCOMPATIBLE verdict is grounded in the real
// detectors' own already-cited guard conditions (scoring/fans-*.ts) or in
// win-detection.ts's own structural definitions; a COMPATIBLE verdict is
// grounded the same way AND has a constructive fixture hand in
// fan-target-compatibility.test.ts where both real detectors actually fire
// together — a reason string alone is not treated as sufficient proof for
// a COMPATIBLE verdict, only the fixture is.
//
// Deliberately data-and-lookup only — no opinion here on how a caller
// should treat a fanId already chosen against itself (a locked-in fan vs. a
// same-fanId candidate for a further unit of it, e.g. Dragon Pung). That is
// an orchestration-layer question for hints.ts's computeRouteToPoints, not
// a route-compatibility classification; self-pairs are outside this
// module's scope (STAGE3_FAN_IDS pairs are always two DISTINCT fanIds).

export const STAGE3_FAN_IDS: readonly number[] = [19, 49, 50, 22, 59, 2, 60, 61, 68, 76]

export function pairKey(fanIdA: number, fanIdB: number): string {
  return fanIdA < fanIdB ? `${fanIdA},${fanIdB}` : `${fanIdB},${fanIdA}`
}

interface CompatibilityEntry {
  compatible: boolean
  reason: string
}

// --- Shared reasoning, referenced by multiple pairs below ---------------

// win-detection.ts's isSevenPairs: `values.length === 7 && values.every(
// (count) => count === 2)` — EVERY one of the 7 groups must have count
// exactly 2, never >= 3. This makes Seven Pairs (19) structurally incapable
// of containing any pung/kong at all, for any tile type. Grounds every
// (19, X) incompatibility below where X requires at least one pung/kong.
const SEVEN_PAIRS_HAS_NO_PUNGS_OR_KONGS =
  'win-detection.ts isSevenPairs (line ~141-147): every one of the 7 groups must have count === 2, never >= 3 — ' +
  'Seven Pairs structurally cannot contain a pung/kong of any tile type. No complete hand can be both.'

// scoring/fans-6.ts detectHalfFlush: `if (!hasHonor || suits.size !== 1)
// return []` — requires >=1 honor tile PRESENT somewhere (pair or set, not
// necessarily a pung) plus every suited tile in exactly one suit.
// scoring/fans-24.ts detectFullFlush: `if (parsed.some((p) => p === null))
// return []` — ANY honor tile disqualifies (0 honors required).
// scoring/fans-2.ts detectAllSimples: `allTileIds.every((id) =>
// !isTerminalTypeId(id) && !isHonorTypeId(id))` — 0 terminals AND 0 honors.
// scoring/fans-1.ts detectNoHonors: `allTileIds.every((id) =>
// !isHonorTypeId(id))` — 0 honors.
// Half Flush's "honor present" requirement directly contradicts Full
// Flush/All Simples/No Honors' "0 honors" requirement.
const HALF_FLUSH_VS_ZERO_HONOR_FANS =
  'scoring/fans-6.ts detectHalfFlush requires >=1 honor tile present (`!hasHonor` guard); the other fan requires ' +
  'zero honor tiles (detectFullFlush/detectAllSimples/detectNoHonors\'s own guards) — direct contradiction, no ' +
  'complete hand can satisfy both.'

// scoring/fans-2.ts detectDragonPung / detectPrevalentWind / detectSeatWind
// and scoring/fans-88.ts detectBigThreeDragons all require at least one
// PUNG/KONG of a dragon or wind tile — dragons/winds are honor tiles
// (scoring/set-helpers.ts isHonorTypeId), so each structurally requires a
// honor tile present, contradicting Full Flush/All Simples/No Honors' 0.
const HONOR_PUNG_FAN_VS_ZERO_HONOR_FANS =
  'This fan requires a pung/kong of a dragon or wind tile (scoring/fans-2.ts detectDragonPung/' +
  'detectPrevalentWind/detectSeatWind, scoring/fans-88.ts detectBigThreeDragons) — dragons/winds are honor tiles ' +
  '(set-helpers.ts isHonorTypeId), directly contradicting the other fan\'s zero-honor requirement ' +
  '(detectFullFlush/detectAllSimples/detectNoHonors\'s own guards). No complete hand can satisfy both.'

// scoring/fans-2.ts detectDragonPung/detectPrevalentWind/detectSeatWind and
// scoring/fans-88.ts detectBigThreeDragons each require at least one
// pung/kong (Dragon Pung: any dragon pung; Prevalent/Seat Wind: the
// specific wind's pung; Big Three Dragons: three dragon pungs) — All Pungs
// (49) requires ALL FOUR sets to be pung/kong, imposing no restriction on
// WHICH tile types those pungs are, so one of the four can always be the
// tile the other fan needs. Constructive: e.g. dragonPung + 3 other pungs +
// pair.
const ALL_PUNGS_ABSORBS_ANY_PUNG_BASED_FAN =
  'All Pungs (49) requires 4 pungs/kongs of ANY tile types (detectAllPungs\'s own `sets.every((s) => s.kind !== ' +
  '\'chow\')` check imposes no tile-type restriction) — one of the four can always be the specific pung the other ' +
  'fan needs. Constructive: that pung + 3 more pungs + a pair.'

// The five fans requiring a pung/kong of a dragon or wind tile (Dragon
// Pung/Big Three Dragons/Prevalent Wind/Seat Wind) never conflict with EACH
// OTHER — each needs a DIFFERENT physical set (a hand has 4 set slots, and
// nothing here asks for more than 3 of them at once: Big Three Dragons=3,
// everything else=1), and dragons/winds are entirely separate tile
// categories so there's no shared-tile contention either.
const HONOR_PUNG_FANS_COEXIST =
  'Each of these needs its own pung/kong of a dragon or wind tile — different physical sets, different tile ' +
  'categories (dragon vs. wind), and a 4-set hand has room for all of them at once (Big Three Dragons uses 3 of ' +
  'the 4 slots; every other fan here uses 1). No contention.'

const PAIRS: ReadonlyArray<[number, number, boolean, string]> = [
  // --- Seven Pairs (19) vs the rest ---
  [19, 49, false, SEVEN_PAIRS_HAS_NO_PUNGS_OR_KONGS],
  [
    19,
    50,
    true,
    'Half Flush only requires a honor tile PRESENT (detectHalfFlush\'s `hasHonor`, satisfied by a honor PAIR, not ' +
      'necessarily a pung) plus one suit for the suited tiles — Seven Pairs can hold a honor pair alongside 6 ' +
      'same-suit pairs. Constructive: 6 pairs one suit + 1 dragon/wind pair.',
  ],
  [
    19,
    22,
    true,
    'Full Flush only requires one suit and zero honors, both whole-hand tile-membership conditions Seven Pairs ' +
      'can satisfy directly. Constructive: 7 pairs, all one suit, no honors.',
  ],
  [19, 59, false, SEVEN_PAIRS_HAS_NO_PUNGS_OR_KONGS],
  [19, 2, false, SEVEN_PAIRS_HAS_NO_PUNGS_OR_KONGS],
  [19, 60, false, SEVEN_PAIRS_HAS_NO_PUNGS_OR_KONGS],
  [19, 61, false, SEVEN_PAIRS_HAS_NO_PUNGS_OR_KONGS],
  [
    19,
    68,
    true,
    'All Simples is a whole-hand tile-membership condition (zero terminals/honors) Seven Pairs can satisfy ' +
      'directly. Constructive: 7 pairs of simple tiles, e.g. ranks 2-8 across suits.',
  ],
  [
    19,
    76,
    true,
    'No Honors is a whole-hand tile-membership condition (zero honors) Seven Pairs can satisfy directly. ' +
      'Constructive: 7 pairs, no honor tiles (terminals allowed).',
  ],

  // --- All Pungs (49) vs the rest ---
  [49, 50, true, ALL_PUNGS_ABSORBS_ANY_PUNG_BASED_FAN],
  [
    49,
    22,
    true,
    'All Pungs imposes no tile-type restriction on its 4 pungs — all four (and the pair) can be the same suit. ' +
      'Constructive: 4 same-suit pungs + same-suit pair, no honors.',
  ],
  [49, 59, true, ALL_PUNGS_ABSORBS_ANY_PUNG_BASED_FAN],
  [
    49,
    2,
    true,
    'All Pungs imposes no tile-type restriction — 3 of its 4 pungs can be the three dragons. Constructive: DR/DG/' +
      'DW pungs + 1 more pung + pair.',
  ],
  [49, 60, true, ALL_PUNGS_ABSORBS_ANY_PUNG_BASED_FAN],
  [49, 61, true, ALL_PUNGS_ABSORBS_ANY_PUNG_BASED_FAN],
  [
    49,
    68,
    true,
    'All Pungs imposes no tile-type restriction — all four pungs and the pair can be simple tiles. Constructive: ' +
      '4 pungs + pair, ranks 2-8 only, no honors.',
  ],
  [
    49,
    76,
    true,
    'All Pungs imposes no tile-type restriction — all four pungs and the pair can be honor-free (terminals ' +
      'allowed). Constructive: 4 pungs + pair, no honor tiles.',
  ],

  // --- Half Flush (50) vs the rest ---
  [50, 22, false, HALF_FLUSH_VS_ZERO_HONOR_FANS],
  [
    50,
    59,
    true,
    'The dragon pung itself satisfies Half Flush\'s honor-present requirement; the rest of the hand supplies the ' +
      'single suit. Constructive: one suit\'s pungs/chows + a dragon pung + pair.',
  ],
  [
    50,
    2,
    true,
    'Three dragon pungs (9 tiles) leave exactly one set + pair (5 tiles) for a single suit, satisfying Half ' +
      'Flush\'s honor-present and one-suit requirements simultaneously. Constructive: DR/DG/DW pungs + one ' +
      'same-suit pung + same-suit pair.',
  ],
  [
    50,
    60,
    true,
    'The wind pung itself satisfies Half Flush\'s honor-present requirement; the rest of the hand supplies the ' +
      'single suit. Constructive: one suit\'s pungs/chows + the prevailing-wind pung + pair.',
  ],
  [
    50,
    61,
    true,
    'The wind pung itself satisfies Half Flush\'s honor-present requirement; the rest of the hand supplies the ' +
      'single suit. Constructive: one suit\'s pungs/chows + the seat-wind pung + pair.',
  ],
  [50, 68, false, HALF_FLUSH_VS_ZERO_HONOR_FANS],
  [50, 76, false, HALF_FLUSH_VS_ZERO_HONOR_FANS],

  // --- Full Flush (22) vs the rest ---
  [22, 59, false, HONOR_PUNG_FAN_VS_ZERO_HONOR_FANS],
  [22, 2, false, HONOR_PUNG_FAN_VS_ZERO_HONOR_FANS],
  [22, 60, false, HONOR_PUNG_FAN_VS_ZERO_HONOR_FANS],
  [22, 61, false, HONOR_PUNG_FAN_VS_ZERO_HONOR_FANS],
  [
    22,
    68,
    true,
    'Full Flush (one suit, zero honors) and All Simples (zero terminals/honors) both narrow which tiles are ' +
      'usable, not conflict — a single suit restricted to ranks 2-8 satisfies both. Constructive: one suit, ' +
      'ranks 2-8 only, 4 sets + pair.',
  ],
  [
    22,
    76,
    true,
    'Full Flush\'s zero-honor requirement trivially satisfies No Honors\' identical requirement — both real ' +
      'detectors fire on the same complete hand (this pair also has a real scoring/exclusions.ts [22,76] entry, ' +
      'resolving the resulting point double-count; that is a separate, already-handled question from whether the ' +
      'underlying conditions can coexist, which they trivially can). Constructive: any Full Flush hand.',
  ],

  // --- Dragon Pung (59) vs the rest ---
  [59, 2, true, 'A hand with 3 dragon pungs satisfies both Dragon Pung (count 3) and Big Three Dragons (also has a real scoring/exclusions.ts [2,59] entry resolving the point double-count, same posture as [22,76] above). Constructive: DR/DG/DW pungs + any 4th set + pair.'],
  [59, 60, true, HONOR_PUNG_FANS_COEXIST],
  [59, 61, true, HONOR_PUNG_FANS_COEXIST],
  [59, 68, false, HONOR_PUNG_FAN_VS_ZERO_HONOR_FANS],
  [59, 76, false, HONOR_PUNG_FAN_VS_ZERO_HONOR_FANS],

  // --- Big Three Dragons (2) vs the rest ---
  [
    2,
    60,
    true,
    'Three dragon pungs (9 tiles) leave exactly one set + pair (5 tiles) for the prevailing-wind pung. ' +
      'Constructive: DR/DG/DW pungs + prevailing-wind pung + pair.',
  ],
  [
    2,
    61,
    true,
    'Three dragon pungs (9 tiles) leave exactly one set + pair (5 tiles) for the seat-wind pung. Constructive: ' +
      'DR/DG/DW pungs + seat-wind pung + pair.',
  ],
  [2, 68, false, HONOR_PUNG_FAN_VS_ZERO_HONOR_FANS],
  [2, 76, false, HONOR_PUNG_FAN_VS_ZERO_HONOR_FANS],

  // --- Prevalent Wind (60) vs the rest ---
  [
    60,
    61,
    true,
    'When the prevailing and seat winds coincide, one pung satisfies both at once (the "double wind" hand — ' +
      'already-cited real evidence in fans-1.ts\'s own detectPrevalentWind/detectSeatWind comment). When they ' +
      'differ, two separate wind pungs (4 set slots available) satisfy both independently. Constructive: a WE ' +
      'pung with prevailingWind=east AND seatWind=east (or two different wind pungs otherwise) + 2 more sets + ' +
      'pair.',
  ],
  [60, 68, false, HONOR_PUNG_FAN_VS_ZERO_HONOR_FANS],
  [60, 76, false, HONOR_PUNG_FAN_VS_ZERO_HONOR_FANS],

  // --- Seat Wind (61) vs the rest ---
  [61, 68, false, HONOR_PUNG_FAN_VS_ZERO_HONOR_FANS],
  [61, 76, false, HONOR_PUNG_FAN_VS_ZERO_HONOR_FANS],

  // --- All Simples (68) vs No Honors (76) ---
  [
    68,
    76,
    true,
    'All Simples\' zero-terminal-AND-zero-honor condition trivially satisfies No Honors\' zero-honor condition — ' +
      'both real detectors fire on the same complete hand (this pair also has a real scoring/exclusions.ts ' +
      '[68,76] entry resolving the point double-count, same posture as [22,76] and [2,59] above). Constructive: ' +
      'any All Simples hand.',
  ],
]

const TABLE: ReadonlyMap<string, CompatibilityEntry> = new Map(
  PAIRS.map(([a, b, compatible, reason]) => [pairKey(a, b), { compatible, reason }]),
)

// Conservative on an unknown pair: false, never true. The completeness
// test (fan-target-compatibility.test.ts) is what actually guarantees this
// branch is unreachable for any pair among STAGE3_FAN_IDS — this is a
// belt-and-suspenders default, not the mechanism the guarantee rests on.
export function isRouteCompatible(fanIdA: number, fanIdB: number): boolean {
  return TABLE.get(pairKey(fanIdA, fanIdB))?.compatible ?? false
}

export function routeCompatibilityReason(fanIdA: number, fanIdB: number): string | undefined {
  return TABLE.get(pairKey(fanIdA, fanIdB))?.reason
}

// Every pair the completeness test must find covered — exported so the test
// doesn't hardcode its own copy of "all C(10,2) pairs" separately from this
// module's own idea of the fan set.
export function allStage3Pairs(): [number, number][] {
  const pairs: [number, number][] = []
  for (let i = 0; i < STAGE3_FAN_IDS.length; i++) {
    for (let j = i + 1; j < STAGE3_FAN_IDS.length; j++) {
      pairs.push([STAGE3_FAN_IDS[i]!, STAGE3_FAN_IDS[j]!])
    }
  }
  return pairs
}
