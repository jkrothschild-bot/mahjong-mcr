import type { Decomposition } from '../win-detection.js'
import { meldTileTypeId, type Meld } from '../meld.js'
import { typeIdOf, type TileTypeId, type Wind } from '../tiles.js'

export interface CombinedSet {
  kind: 'chow' | 'pung' | 'kong'
  typeId: TileTypeId
  // True for anything never claimed from another player: every
  // decomposition-derived set (decomposeHand only ever runs against the
  // concealed portion) and a concealed kong. False for any exposed meld
  // (claimed pung/chow, kong claimed from a discard, or a promoted kong —
  // promotion happens in reaction to an exposed pung, so it stays
  // exposed). A pung/chow completed by the winning tile itself (self-draw
  // or discard) is still concealed under this model — it was never
  // claimed with an explicit call mid-hand; see docs/rules/decisions.md
  // for this judgment call.
  concealed: boolean
}

// Combines a candidate decomposition's concealed-side sets with the
// player's already-formed melds into one flat list of "all 4 sets" —
// needed by fans that reason about the sets as a whole (Big Four Winds,
// Little Four Winds, Four Concealed Pungs, etc.). A kong is always in
// `melds` (decomposeHand only ever produces chow/pung for the concealed
// portion), so this is the only place a hand's full set of 4 groupings
// comes together.
export function allSets(melds: readonly Meld[], decomposition: Decomposition): CombinedSet[] {
  const fromMelds: CombinedSet[] = melds.map((m) => ({
    kind: m.kind,
    typeId: meldTileTypeId(m),
    concealed: m.exposure === 'concealed',
  }))
  const fromDecomp: CombinedSet[] = decomposition.sets.map((s) => ({
    kind: s.type,
    typeId: s.tiles[0],
    concealed: true,
  }))
  return [...fromMelds, ...fromDecomp]
}

export function isWindTypeId(id: TileTypeId): boolean {
  return id === 'WE' || id === 'WS' || id === 'WW' || id === 'WN'
}

export function isDragonTypeId(id: TileTypeId): boolean {
  return id === 'DR' || id === 'DG' || id === 'DW'
}

export function isHonorTypeId(id: TileTypeId): boolean {
  return isWindTypeId(id) || isDragonTypeId(id)
}

export function isTerminalTypeId(id: TileTypeId): boolean {
  return id === 'C1' || id === 'C9' || id === 'D1' || id === 'D9' || id === 'B1' || id === 'B9'
}

// Maps a Wind (used by HandContext's prevailingWind/seatWind) to its tile
// type id, so wind-pung fans can compare directly against a set's typeId.
export function windTypeId(wind: Wind): TileTypeId {
  return typeIdOf({ kind: 'wind', wind })
}

export type SuitChar = 'C' | 'D' | 'B'

// All 6 orderings of the 3 suits — used by fans that need "one set per
// suit, ranks forming some pattern" without a fixed suit-to-position
// mapping (Mixed Shifted Pungs, Mixed Shifted Chows): the rulebook doesn't
// pin which suit gets which rank, just that some assignment works.
export const SUIT_PERMUTATIONS: readonly SuitChar[][] = [
  ['C', 'D', 'B'],
  ['C', 'B', 'D'],
  ['D', 'C', 'B'],
  ['D', 'B', 'C'],
  ['B', 'C', 'D'],
  ['B', 'D', 'C'],
]

export interface ParsedSuited {
  suit: SuitChar
  rank: number
}

// Parses a suited tile type id into its suit + numeric rank, or null if it
// isn't a suited tile at all. Deliberately requires the second character to
// be a digit — a naive `id[0]` check would wrongly treat Dragons (DR/DG/DW)
// as the same "suit" as Dots (D1-D9), since both start with 'D'. Mirrors
// win-detection.ts's chowNeighbors regex.
export function parseSuited(id: TileTypeId): ParsedSuited | null {
  const match = /^([CDB])([1-9])$/.exec(id)
  if (!match) return null
  return { suit: match[1] as 'C' | 'D' | 'B', rank: Number(match[2]) }
}

// Every 3-element combination of `items` (order-independent) — used by
// fans-24.ts's detectPureShiftedPungs and fans-16.ts's detectPureShiftedChows
// to search for a qualifying trio AMONG the hand's pung/chow-type sets,
// rather than requiring the whole hand to have exactly 3 of them (a 4-set
// hand can have a 4th, unrelated pung/chow alongside a genuine 3-shifted-set
// run — see docs/rules/decisions.md #34's fixture for a real case).
export function combinations3<T>(items: readonly T[]): T[][] {
  const result: T[][] = []
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      for (let k = j + 1; k < items.length; k++) {
        result.push([items[i]!, items[j]!, items[k]!])
      }
    }
  }
  return result
}
