// Shared low-level building blocks for every generator in generators/*.ts:
// a per-hand tile allocator (never hands out a 5th physical copy of a type —
// TILE_TYPE_BY_ID only has 4), meld constructors matching the shapes
// meld.ts's Meld type expects, and small deterministic-random pickers built
// on the engine's own mulberry32/shuffle (never Math.random — every
// generated hand must be reproducible from its seed alone, per
// KICKOFF-validation-harness.md 1a).
import {
  ORDERED_STANDARD_TYPE_IDS,
  TILE_TYPE_BY_ID,
  typeIdOfInstance,
  type Meld,
  type MeldKind,
  type Rng,
  type TileInstanceId,
  type TileTypeId,
  type Wind,
} from '@mahjong-mcr/engine'

const WINDS: readonly Wind[] = ['east', 'south', 'west', 'north']

export function pick<T>(items: readonly T[], rng: Rng): T {
  const item = items[Math.floor(rng.next() * items.length)]
  if (item === undefined) throw new Error('pick: empty array')
  return item
}

export function chance(probability: number, rng: Rng): boolean {
  return rng.next() < probability
}

export function randomWind(rng: Rng): Wind {
  return pick(WINDS, rng)
}

// Every standard suited/honor type id — 34 entries (no flowers/seasons,
// which this harness deliberately never generates; see generate.ts's
// header comment on the flowerCount=0 scope decision).
export const ALL_STANDARD_TYPE_IDS: readonly TileTypeId[] = ORDERED_STANDARD_TYPE_IDS

// Hands out fresh physical TileInstanceIds for a type, never exceeding the
// 4 physical copies TILE_TYPE_BY_ID actually has. Shared across one hand's
// entire construction (pair + concealed sets + melds all draw from the same
// allocator) so a generator can never accidentally invent a 5th copy of
// anything — the same bug class win-detection.ts's own decomposeHand search
// is careful to avoid.
export class TileAllocator {
  private usedByType = new Map<TileTypeId, TileInstanceId[]>()

  // How many more physical copies of `typeId` remain available.
  remaining(typeId: TileTypeId): number {
    return 4 - (this.usedByType.get(typeId)?.length ?? 0)
  }

  take(typeId: TileTypeId, count: number): TileInstanceId[] {
    const used = this.usedByType.get(typeId) ?? []
    const usedSet = new Set(used)
    const picked: TileInstanceId[] = []
    for (let instance = 0; instance < TILE_TYPE_BY_ID.length && picked.length < count; instance++) {
      if (usedSet.has(instance)) continue
      if (typeIdOfInstance(instance) === typeId) picked.push(instance)
    }
    if (picked.length < count) {
      throw new Error(`TileAllocator: requested ${count} of ${typeId}, only ${picked.length} physically remain`)
    }
    this.usedByType.set(typeId, [...used, ...picked])
    return picked
  }
}

let nextMeldSeq = 0
function meldId(): string {
  nextMeldSeq += 1
  return `gen-${nextMeldSeq}`
}

export function makeChowMeld(tiles: TileInstanceId[]): Meld {
  return { id: meldId(), kind: 'chow', exposure: 'exposed', tiles, ownerSeat: 0, claimedFrom: { seat: 3, discardTile: tiles[0]! } }
}

export function makePungMeld(tiles: TileInstanceId[], exposure: 'concealed' | 'exposed'): Meld {
  return exposure === 'exposed'
    ? { id: meldId(), kind: 'pung', exposure, tiles, ownerSeat: 0, claimedFrom: { seat: 3, discardTile: tiles[0]! } }
    : { id: meldId(), kind: 'pung', exposure, tiles, ownerSeat: 0 }
}

export type KongVariant = 'concealed' | 'exposedFromDiscard' | 'promotedFromPung'

export function makeKongMeld(tiles: TileInstanceId[], variant: KongVariant): Meld {
  const base: Meld = { id: meldId(), kind: 'kong', exposure: variant === 'concealed' ? 'concealed' : 'exposed', kongSource: variant, tiles, ownerSeat: 0 }
  if (variant === 'exposedFromDiscard') return { ...base, claimedFrom: { seat: 3, discardTile: tiles[0]! } }
  return base
}

export function meldKindWeighted(rng: Rng): MeldKind {
  const r = rng.next()
  if (r < 0.5) return 'chow'
  if (r < 0.85) return 'pung'
  return 'kong'
}

// Returns the two neighbor ranks of a chow starting at `typeId`, or null if
// `typeId` can't start a chow (rank > 7, or an honor). Mirrors
// win-detection.ts's chowNeighbors but re-implemented independently here —
// this harness is a SECOND implementation checking the engine, so it
// deliberately does not import win-detection.ts's own helper for this.
export function chowStartCandidates(): readonly { suit: 'C' | 'D' | 'B'; startRank: number }[] {
  const out: { suit: 'C' | 'D' | 'B'; startRank: number }[] = []
  for (const suit of ['C', 'D', 'B'] as const) {
    for (let startRank = 1; startRank <= 7; startRank++) out.push({ suit, startRank })
  }
  return out
}
