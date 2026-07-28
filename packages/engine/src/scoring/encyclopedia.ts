import { FAN_REGISTRY, type FanMeta } from './registry.js'

// Rule text for the SPEC.md §6 fan encyclopedia — transcribed directly from
// docs/rules/mcr_EN.pdf §3.8.1 "Points-Form of Various Kinds of FAN" (pp.
// 14-16, extracted via pdftotext -layout and read in full), NOT re-derived
// from memory or paraphrased from the fans-*.ts detector comments (which
// occasionally simplify or annotate the book's wording for implementation
// purposes — e.g. fan 75's detector comment quotes "exactly two of the
// three suits," but the book itself says "only two... it lacks any tiles
// from one of the three suits," and decisions.md #14 already flags the
// exact-vs-at-most reading as an implementation judgment call, not settled
// book text). Every entry here is the book's own description column,
// verbatim, for the fan's canonical name/points as already established in
// FAN_REGISTRY (a few headers in the PDF itself use slightly different
// naming, e.g. "Two Dragons Pungs" / "Upper Five" — FAN_REGISTRY's names
// win for display, consistent with registry.ts's own note about picking
// one canonical name per fan across the book's naming variants).
//
// No example hands in v1 — constructing 81 valid, correctly-scored worked
// examples is a substantially larger and more error-prone undertaking than
// transcribing the existing definition table, better done as a dedicated
// follow-up (tracked in docs/rules/decisions.md) than folded into this pass.
export const FAN_RULE_TEXT: Readonly<Record<number, string>> = {
  1: 'Pungs or Kongs of all four Wind Tiles.',
  2: 'Pungs or Kongs of all three Dragon Tiles.',
  3: 'A hand in which the chows, pungs and pair(s) are made up solely of "green" tiles: 2 Bam, 3 Bam, 4 Bam, 6 Bam, 8 Bam, and Green Dragon.',
  4: 'Holding the 1,1,1,2,3,4,5,6,7,8,9,9,9 tiles in any one of the suits, creating the nine-sided wait of 1,2,3,4,5,6,7,8,9.',
  5: 'Any hand that includes four kongs. They may be concealed or melded.',
  6: 'A hand formed by seven pairs of the same suit, each shifted one up from the last.',
  7: 'A hand created by singles of any 12 of the 1, 9, and Honor tiles, along with a pair of the 13th.',
  8: 'The pair(s), Pungs or Kongs are all made up of 1 or 9 Number Tiles, without Honor Tiles.',
  9: 'A hand that includes three Pungs or Kongs of Wind Tiles and a pair of the fourth Wind.',
  10: 'A hand that includes two Pungs or Kongs of the Dragon Tiles and a pair of the third Dragon.',
  11: 'The pair(s), Pungs or Kongs are all made up of Honor Tiles.',
  12: 'A hand that includes four Concealed Pungs or Kongs (achieved without melding).',
  13: 'A hand consisting of two each of the lower and upper terminal Chows in one suit only, and a pair of fives in the same suit.',
  14: 'Four chows of the same continuous number sequence in the same suit.',
  15: 'Four Pungs (or Kongs) in the same suit, each shifted one up from the last.',
  16: 'Four chows in one suit each shifted up 1 or 2 numbers from the last, but not a combination of both.',
  17: 'A hand containing three Kongs.',
  18: 'The pair(s), Pungs or Kongs is all made up of 1 or 9 Number Tiles and Honor Tiles.',
  19: 'A hand formed by seven pairs.',
  20: 'Formed by seven single honors and singles of suit tiles belonging to separate Knitted sequences (for example, 1-4-7 of Bamboos, 2-5-8 of Characters, and 3-6-9 of Dots).',
  21: 'A hand formed with Pungs or Kongs of 2, 4, 6, and 8 tiles, with a pair of the same.',
  22: 'A hand formed entirely of a single suit.',
  23: 'Three chows of the same numerical sequence and in the same suit.',
  24: 'Three Pungs or Kongs of the same suit, each shifted one up from the last.',
  25: 'A hand consisting entirely of 7, 8, and 9 tiles.',
  26: 'A hand consisting entirely of 4, 5, and 6 tiles.',
  27: 'A hand consisting entirely of 1, 2, and 3 tiles.',
  28: 'A hand using one each of all the numbers 1 through 9 from any one suit, forming three consecutive chows.',
  29: 'A hand consisting of 1-2-3 and 7-8-9 in one suit (Two Terminal Chows), 1-2-3 and 7-8-9 in another suit, and a pair of fives in the remaining suit.',
  30: 'Three chows in one suit each shifted either one or two numbers up from the last, but not a combination of both.',
  31: 'A hand in which every set (chow, pung, kong, pair) includes the number "5".',
  32: 'Three Pungs (or Kongs) of the same number in each suit.',
  33: 'Three Concealed Pungs or Kongs (achieved without melding).',
  34: 'Formed by single honors, and singles of suit tiles belonging to separate Knitted sequences (for example, 1-4-7 of Bamboo, 2-5-8 of Characters, and 3-6-9 of Dots - each of the 3 suits must belong to a different Knitted sequence, but not necessarily in this order).',
  35: 'A special Straight which is formed not with standard chows but with 3 different Knitted sequences. For example, 1-4-7 of Dots, 2-5-8 of Characters, and 3-6-9 of Bamboos - but not necessarily in the order in this example.',
  36: 'A hand created with suit tiles 6 through 9.',
  37: 'A hand created with suit tiles 1 through 4.',
  38: 'A hand that includes one pung (or kong) of each of the three winds.',
  39: 'A straight (tiles 1 through 9) formed by chows from all three suits.',
  40: 'A hand created entirely with those tiles which are vertically symmetrical, which means the carved designs look the same if you turn them upside-down. These tiles are the 1, 2, 3, 4, 5, 8, and 9 Dots, the 2, 4, 5, 6, 8, and 9 Bams, and the White Dragon.',
  41: 'Three chows of the same numerical sequence, one in each suit.',
  42: 'Three pungs (or kongs), one in each suit, each shifted up one number from the last.',
  43: 'A hand that would otherwise earn 0 points (excluding the Flower Tiles).',
  44: 'Going out (making mahjong) on a pick of the very last tile of the wall. (Points for Self-Drawn may not be combined.)',
  45: 'The last tile (of the game) discarded by another player.',
  46: 'Going out (making mahjong) off the discard which is the last tile in the game. Going out (making mahjong) on the replacement tile drawn after achieving a kong (not on a Flower replacement).',
  47: 'Winning off the tile that somebody adds to a melded pung (to create a Kong). (The points for Last Tile may not be combined.)',
  48: 'A hand that includes two Concealed Kongs.',
  49: 'A hand formed by four Pungs (or Kongs) and one pair.',
  50: 'A hand formed by tiles from any one of the three suits, in combination with Honor tiles.',
  51: 'Three chows, one in each suit, each shifted up one number from the last.',
  52: 'A hand in which each of the five sets (pungs, kongs, chows, pairs) is composed of a different type of tile (Characters, Bamboo, Dots, Winds, and Dragons).',
  53: 'Every set in the hand (chow, pung, kong, and pair) must be completed with tiles discarded by other players. All sets must be exposed, and the player goes out on a single wait off another player.',
  54: 'Two pungs (or kongs) of Dragon tiles.',
  55: 'A hand that includes terminals and honors in each set, including the pair.',
  56: 'A hand that a player completes without any melds, and wins by Self-Draw.',
  57: 'A hand that includes two Melded Kongs. One Melded Kong and one Concealed Kong are 6 points.',
  58: 'Winning on a tile that is the last of its kind. (It must be clear to all players based on the discards and exposures.)',
  59: 'A Pung or Kong of Dragon Tiles.',
  60: 'A Pung or Kong of the Wind Tile corresponding to the current Prevalent Wind.',
  61: "A Pung or Kong of the Wind Tile corresponding to the player's Seat position at the table. (Dealer is East; proceeding counter-clockwise from the Dealer; other players' seats are South, West, and North.)",
  62: 'Having a concealed hand (no melded sets) and winning by discard.',
  63: 'A hand consisting of all chows, with no Honors.',
  64: 'Using all four of a single suit tile, without using them as a Kong.',
  65: 'Two Pungs (or Kongs) of the same number in two different suits.',
  66: 'Two Pungs achieved without melding.',
  67: 'Created when four identical tiles, all self-drawn, are declared as a Kong.',
  68: 'A hand formed without Terminal or Honor Tiles.',
  69: 'Two identical chows in the same suit.',
  70: 'Two chows of the same numbers but in different suits.',
  71: 'Two chows in the same suit that runs consecutively after one another to make a six-tile straight.',
  72: 'Chows of 1-2-3 and 7-8-9 in the same suit.',
  73: 'A Pung or Kong of Ones, Nines, or Winds. (A dragon pung scores 2 points.)',
  74: 'A kong that was claimed from another player or promoted from a melded pung.',
  75: 'A hand that uses tiles from only two of the three suits (it lacks any tiles from one of the three suits).',
  76: 'A hand formed entirely of suit tiles, without Winds or Dragons.',
  77: 'Waiting solely for a 3 to form a 1-2-3 chow, or solely for a 7 to form a 7-8-9 chow. Not valid if waiting for more than one tile. Not valid if the edge wait is combined with any other waits.',
  78: 'Waiting solely for a tile whose number is "inside" (in the middle) to form a chow. Not valid if waiting for more than one tile. Not valid if the closed wait is combined with other waits.',
  79: 'Waiting solely for a tile to form a pair. Not valid if waiting for more than one tile (for example, holding 1-2-3-4 and waiting on the 1 and 4).',
  80: 'Going out (making mahjong) with a fresh tile picked from the wall.',
  81: 'Each tile carved with Chinese word for Spring, Summer, Autumn, Winter, Plum, Orchid, Bamboo or Chrysanthemum, will award you one point when you succeed in Hu. In case of "Hu" on a Flower replacement, the point for Self-Drawn can be added, but not the points for Out with Replacement Tile. Flower Tiles may be discarded (without taking a replacement).',
}

if (Object.keys(FAN_RULE_TEXT).length !== 81) {
  throw new Error(`Expected 81 fan rule-text entries, got ${Object.keys(FAN_RULE_TEXT).length}`)
}

export interface FanEncyclopediaEntry extends FanMeta {
  ruleText: string
}

export const ALL_FANS: readonly FanEncyclopediaEntry[] = Object.values(FAN_REGISTRY)
  .slice()
  .sort((a, b) => a.id - b.id)
  .map((meta) => ({ ...meta, ruleText: FAN_RULE_TEXT[meta.id]! }))
