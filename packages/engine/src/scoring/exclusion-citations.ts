// A guard against docs/rules/decisions.md #23's exact failure mode: an
// exclusion-table entry justified ONLY by matching PyMahjongGB's behavior,
// with no independent docs/rules/mcr_EN.pdf citation. That kind of entry is
// invisible to the PyMahjongGB cross-check forever once it ships — both
// engines then agree, so no harness run, however large, can ever flag it
// again. Only a human re-reading the primary source caught item #23 (see
// decisions.md #32). This module makes that class of error impossible to
// land silently, without requiring every pre-existing entry to be
// individually re-cited right now (decisions.md #32's "Open follow-up work"
// explicitly deferred that backfill).
//
// Mechanism: GRANDFATHERED_PAIRS is a frozen SNAPSHOT of every pair in
// exclusions.ts's RAW_EXCLUSION_PAIRS as of the day this guard was added
// (2026-08-06) — a hardcoded copy, not a live reference, so it can never
// silently grow to cover a pair added later. exclusions.test.ts's guard
// test asserts every pair currently in RAW_EXCLUSION_PAIRS is EITHER in
// this frozen snapshot (grandfathered, no citation required yet) OR has a
// real, non-empty entry in CITATIONS below (required for anything new).
// Backfilling a grandfathered pair's real citation later is as simple as
// adding it to CITATIONS — the guard doesn't care which category currently
// covers a pair, only that every pair is covered by at least one.
export const GRANDFATHERED_PAIRS: readonly [number, number][] = [
  [8, 18], [11, 18], [6, 19], [6, 76], [54, 59], [32, 65], [41, 70], [48, 67],
  [57, 74], [28, 71], [28, 72], [38, 73], [56, 80], [1, 38], [1, 49], [1, 60],
  [1, 61], [1, 73], [2, 54], [2, 59], [3, 50], [3, 75], [4, 22], [4, 62],
  [4, 73], [5, 79], [6, 22], [6, 62], [6, 79], [7, 52], [7, 62], [7, 79],
  [8, 49], [8, 55], [8, 73], [8, 76], [9, 38], [9, 73], [10, 54], [10, 59],
  [11, 49], [11, 55], [11, 73], [12, 49], [12, 62], [13, 19], [13, 22],
  [13, 63], [13, 69], [13, 72], [13, 76], [14, 24], [14, 64], [14, 69],
  [15, 23], [15, 49], [16, 71], [18, 49], [18, 73], [19, 62], [19, 79],
  [20, 52], [20, 62], [21, 49], [21, 68], [22, 76], [23, 24], [23, 69],
  [25, 76], [26, 76], [26, 68], [27, 76], [29, 69], [29, 72], [29, 76],
  [29, 63], [31, 68], [34, 52], [34, 62], [36, 76], [37, 76], [40, 75],
  [44, 80], [46, 80], [47, 58], [53, 79], [63, 76], [68, 76], [77, 78],
  [77, 79], [78, 79],
]

// Real citations for pairs added or changed AFTER this guard existed. Every
// entry here needs an actual rulebook grounding — a section/page + quote,
// or an explicit "derived from fan N's own already-quoted text" — never a
// PyMahjongGB source citation alone with nothing else (that's exactly what
// item #23 had, and exactly what this map exists to prevent from
// recurring). Keyed by pairKey(a, b) below.
export const CITATIONS: ReadonlyMap<string, string> = new Map([
  [
    pairKey(21, 76),
    'docs/rules/mcr_EN.pdf §3.8.1 p.15: All Even Pungs (21) — "A hand formed with Pungs or Kongs of 2, 4, 6, and 8 ' +
      'tiles, with a pair of the same" — every set AND the pair is restricted to even-numbered suit ranks, which ' +
      'structurally excludes honor tiles (no numeric rank at all), trivially satisfying No Honors (76: "formed ' +
      'entirely of suit tiles, without Winds or Dragons"). docs/rules/decisions.md #26/#33.',
  ],
  [
    pairKey(31, 76),
    'docs/rules/mcr_EN.pdf §3.8.1 p.16: All Fives (31) — "A hand in which every set (chow, pung, kong, pair) ' +
      'includes the number \'5\'" — every group must contain a suited rank-5 tile, structurally excluding honor ' +
      'tiles, trivially satisfying No Honors (76). docs/rules/decisions.md #26/#33.',
  ],
])

export function pairKey(a: number, b: number): string {
  return a < b ? `${a},${b}` : `${b},${a}`
}

const GRANDFATHERED_KEYS: ReadonlySet<string> = new Set(GRANDFATHERED_PAIRS.map(([a, b]) => pairKey(a, b)))

// Returns true if this pair is covered — either grandfathered (pre-existing,
// no citation required yet) or has a real citation in CITATIONS. Returns
// false if it's neither, which the guard test in exclusions.test.ts treats
// as a hard failure: a genuinely new, uncited exclusion pair.
export function isCovered(a: number, b: number): boolean {
  const key = pairKey(a, b)
  return GRANDFATHERED_KEYS.has(key) || (CITATIONS.get(key)?.trim().length ?? 0) > 0
}
