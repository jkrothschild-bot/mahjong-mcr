// Full 81-fan metadata (id, name, points), transcribed from the official MCR
// rulebook (docs/rules/mcr_EN.pdf, §3.8.1 "Points-Form of Various Kinds of
// FAN" table pages 14-18, cross-checked against Appendix 1 pages 24-41,
// reconciled twice to exactly 81 entries across the twelve point grades).
//
// This registry is metadata only — id/name/points for all 81, independent
// of whether a detector function exists for a given fan yet (see
// score-hand.ts's DETECTORS map for what's actually implemented). Building
// the full registry now (rather than growing it fan-by-fan) means every
// future batch session is purely additive: exclusion pairs can reference
// any fan by id even before that fan has a detector.
//
// Deliberately does NOT include a "category" field — the rulebook's nine
// category names (Honor Tiles Based, Chow Based, etc.) appear exactly once
// in the §3.8 intro paragraph and are never assigned per-fan anywhere in
// the actual text. Any per-fan category would be an inference, not a book
// fact, so it's omitted rather than shipped as pseudo-authoritative.
//
// A few fans have naming variants between §3.8.1 and Appendix 1 (e.g. "All
// Honor" vs "All Honors", "Upper Five" vs "Upper Four") — one canonical
// name is picked per fan below; this is presentational metadata only and
// doesn't affect scoring logic.
export interface FanMeta {
  id: number
  name: string
  points: number
}

export const FAN_REGISTRY: Readonly<Record<number, FanMeta>> = {
  1: { id: 1, name: 'Big Four Winds', points: 88 },
  2: { id: 2, name: 'Big Three Dragons', points: 88 },
  3: { id: 3, name: 'All Green', points: 88 },
  4: { id: 4, name: 'Nine Gates', points: 88 },
  5: { id: 5, name: 'Four Kongs', points: 88 },
  6: { id: 6, name: 'Seven Shifted Pairs', points: 88 },
  7: { id: 7, name: 'Thirteen Orphans', points: 88 },
  8: { id: 8, name: 'All Terminals', points: 64 },
  9: { id: 9, name: 'Little Four Winds', points: 64 },
  10: { id: 10, name: 'Little Three Dragons', points: 64 },
  11: { id: 11, name: 'All Honors', points: 64 },
  12: { id: 12, name: 'Four Concealed Pungs', points: 64 },
  13: { id: 13, name: 'Pure Terminal Chows', points: 64 },
  14: { id: 14, name: 'Quadruple Chow', points: 48 },
  15: { id: 15, name: 'Four Pure Shifted Pungs', points: 48 },
  16: { id: 16, name: 'Four Shifted Chows', points: 32 },
  17: { id: 17, name: 'Three Kongs', points: 32 },
  18: { id: 18, name: 'All Terminals and Honors', points: 32 },
  19: { id: 19, name: 'Seven Pairs', points: 24 },
  20: { id: 20, name: 'Greater Honors and Knitted Tiles', points: 24 },
  21: { id: 21, name: 'All Even Pungs', points: 24 },
  22: { id: 22, name: 'Full Flush', points: 24 },
  23: { id: 23, name: 'Pure Triple Chow', points: 24 },
  24: { id: 24, name: 'Pure Shifted Pungs', points: 24 },
  25: { id: 25, name: 'Upper Tiles', points: 24 },
  26: { id: 26, name: 'Middle Tiles', points: 24 },
  27: { id: 27, name: 'Lower Tiles', points: 24 },
  28: { id: 28, name: 'Pure Straight', points: 16 },
  29: { id: 29, name: 'Three-Suited Terminal Chows', points: 16 },
  30: { id: 30, name: 'Pure Shifted Chows', points: 16 },
  31: { id: 31, name: 'All Fives', points: 16 },
  32: { id: 32, name: 'Triple Pung', points: 16 },
  33: { id: 33, name: 'Three Concealed Pungs', points: 16 },
  34: { id: 34, name: 'Lesser Honors and Knitted Tiles', points: 12 },
  35: { id: 35, name: 'Knitted Straight', points: 12 },
  36: { id: 36, name: 'Upper Four', points: 12 },
  37: { id: 37, name: 'Lower Four', points: 12 },
  38: { id: 38, name: 'Big Three Winds', points: 12 },
  39: { id: 39, name: 'Mixed Straight', points: 8 },
  40: { id: 40, name: 'Reversible Tiles', points: 8 },
  41: { id: 41, name: 'Mixed Triple Chow', points: 8 },
  42: { id: 42, name: 'Mixed Shifted Pungs', points: 8 },
  43: { id: 43, name: 'Chicken Hand', points: 8 },
  44: { id: 44, name: 'Last Tile Draw', points: 8 },
  45: { id: 45, name: 'Last Tile Claim', points: 8 },
  46: { id: 46, name: 'Out with Replacement Tile', points: 8 },
  47: { id: 47, name: 'Robbing The Kong', points: 8 },
  48: { id: 48, name: 'Two Concealed Kongs', points: 8 },
  49: { id: 49, name: 'All Pungs', points: 6 },
  50: { id: 50, name: 'Half Flush', points: 6 },
  51: { id: 51, name: 'Mixed Shifted Chows', points: 6 },
  52: { id: 52, name: 'All Types', points: 6 },
  53: { id: 53, name: 'Melded Hand', points: 6 },
  54: { id: 54, name: 'Two Dragon Pungs', points: 6 },
  55: { id: 55, name: 'Outside Hand', points: 4 },
  56: { id: 56, name: 'Fully Concealed Hand', points: 4 },
  57: { id: 57, name: 'Two Melded Kongs', points: 4 },
  58: { id: 58, name: 'Last Tile', points: 4 },
  59: { id: 59, name: 'Dragon Pung', points: 2 },
  60: { id: 60, name: 'Prevalent Wind', points: 2 },
  61: { id: 61, name: 'Seat Wind', points: 2 },
  62: { id: 62, name: 'Concealed Hand', points: 2 },
  63: { id: 63, name: 'All Chows', points: 2 },
  64: { id: 64, name: 'Tile Hog', points: 2 },
  65: { id: 65, name: 'Double Pung', points: 2 },
  66: { id: 66, name: 'Two Concealed Pungs', points: 2 },
  67: { id: 67, name: 'Concealed Kong', points: 2 },
  68: { id: 68, name: 'All Simples', points: 2 },
  69: { id: 69, name: 'Pure Double Chow', points: 1 },
  70: { id: 70, name: 'Mixed Double Chow', points: 1 },
  71: { id: 71, name: 'Short Straight', points: 1 },
  72: { id: 72, name: 'Two Terminal Chows', points: 1 },
  73: { id: 73, name: 'Pung of Terminals or Honors', points: 1 },
  74: { id: 74, name: 'Melded Kong', points: 1 },
  75: { id: 75, name: 'One Voided Suit', points: 1 },
  76: { id: 76, name: 'No Honors', points: 1 },
  77: { id: 77, name: 'Edge Wait', points: 1 },
  78: { id: 78, name: 'Closed Wait', points: 1 },
  79: { id: 79, name: 'Single Wait', points: 1 },
  80: { id: 80, name: 'Self-Drawn', points: 1 },
  81: { id: 81, name: 'Flower Tiles', points: 1 },
}

if (Object.keys(FAN_REGISTRY).length !== 81) {
  throw new Error(`Expected 81 registered fans, got ${Object.keys(FAN_REGISTRY).length}`)
}
