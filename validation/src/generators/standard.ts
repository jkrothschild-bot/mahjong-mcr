// Random "four sets + pair" hands (win-detection.ts shape 1) — the bulk of
// this harness's 1000+ generated hands. Builds a random valid decomposition
// directly (pair + 4 sets, some possibly declared as melds), allocates real
// TileInstanceIds for it via TileAllocator, and verifies with isWinningHand
// before returning — a hand that fails that check is a generator bug and
// must throw (KICKOFF-validation-harness.md 1a), never be silently skipped.
import { isWinningHand, shuffle, type Meld, type Rng, type TileInstanceId, type TileTypeId } from '@mahjong-mcr/engine'
import type { GeneratedCase } from '../case-types.js'
import {
  ALL_STANDARD_TYPE_IDS,
  TileAllocator,
  chance,
  chowStartCandidates,
  makeChowMeld,
  makeKongMeld,
  makePungMeld,
  pick,
} from '../hand-helpers.js'
import { pickWinningTile, randomWinCircumstance } from '../win-circumstance.js'

const HONOR_TYPE_IDS: readonly TileTypeId[] = ['WE', 'WS', 'WW', 'WN', 'DR', 'DG', 'DW']

// Tries, in a shuffled order, to allocate a pung (or kong) of SOME type with
// enough remaining physical copies. Returns null only if truly nothing has
// enough left (never happens in practice at hand-sized budgets, but the
// caller must handle it rather than assume).
function tryAllocatePungLike(allocator: TileAllocator, copiesNeeded: 3 | 4, rng: Rng): { typeId: TileTypeId; tiles: TileInstanceId[] } | null {
  const candidates = shuffle(ALL_STANDARD_TYPE_IDS, rng)
  for (const typeId of candidates) {
    if (allocator.remaining(typeId) >= copiesNeeded) {
      return { typeId, tiles: allocator.take(typeId, copiesNeeded) }
    }
  }
  return null
}

function tryAllocateChow(allocator: TileAllocator, rng: Rng): { typeIds: [TileTypeId, TileTypeId, TileTypeId]; tiles: TileInstanceId[] } | null {
  const candidates = shuffle(chowStartCandidates(), rng)
  for (const { suit, startRank } of candidates) {
    const ids: [TileTypeId, TileTypeId, TileTypeId] = [`${suit}${startRank}`, `${suit}${startRank + 1}`, `${suit}${startRank + 2}`]
    if (ids.every((id) => allocator.remaining(id) >= 1)) {
      const tiles = ids.map((id) => allocator.take(id, 1)[0]!)
      return { typeIds: ids, tiles }
    }
  }
  return null
}

function tryAllocatePair(allocator: TileAllocator, rng: Rng): TileInstanceId[] | null {
  const candidates = shuffle(ALL_STANDARD_TYPE_IDS, rng)
  for (const typeId of candidates) {
    if (allocator.remaining(typeId) >= 2) return allocator.take(typeId, 2)
  }
  return null
}

export interface StandardGeneratorOptions {
  // Biases meld count and honors/terminals so targeted callers (coverage.ts)
  // can lean this same generator toward specific fan families instead of
  // hand-writing a bespoke constructor for every one of them.
  minMelds?: number
  maxMelds?: number
  preferHonorSets?: boolean
}

export function generateStandardHand(seed: number, rng: Rng, options: StandardGeneratorOptions = {}): GeneratedCase {
  const { minMelds = 0, maxMelds = 4 } = options
  const allocator = new TileAllocator()
  const melds: Meld[] = []

  const numMelds = minMelds + Math.floor(rng.next() * (maxMelds - minMelds + 1))

  for (let i = 0; i < numMelds; i++) {
    const r = rng.next()
    const kind = r < 0.45 ? 'chow' : r < 0.8 ? 'pung' : 'kong'

    if (kind === 'chow') {
      const chow = tryAllocateChow(allocator, rng)
      if (!chow) continue // budget exhausted this deep into the hand; just field fewer melds
      melds.push(makeChowMeld(chow.tiles))
      continue
    }

    if (kind === 'pung') {
      const pung = tryAllocatePungLike(allocator, 3, rng)
      if (!pung) continue
      // A declared pung Meld is always exposed by construction — meld.ts's
      // own model only allows exposure:'concealed' for a kong. A concealed
      // pung is never a Meld object at all in this engine; it stays as
      // plain tiles in concealedTiles, discovered by decomposeHand exactly
      // like the setsNeeded loop below already does. Generating a
      // concealed-exposure pung Meld here would build a hand shape the real
      // engine can never produce, AND would silently corrupt the
      // PyMahjongGB pack conversion (build-pmgb-input.ts only special-cases
      // concealed KONGs) — caught by hand-diffing early scratch runs.
      melds.push(makePungMeld(pung.tiles, 'exposed'))
      continue
    }

    // kong
    const kong = tryAllocatePungLike(allocator, 4, rng)
    if (!kong) continue
    const variant = chance(0.4, rng) ? 'concealed' : chance(0.5, rng) ? 'exposedFromDiscard' : 'promotedFromPung'
    melds.push(makeKongMeld(kong.tiles, variant))
  }

  const setsNeeded = 4 - melds.length
  const concealedSetTiles: TileInstanceId[] = []
  for (let i = 0; i < setsNeeded; i++) {
    const useChow = chance(options.preferHonorSets ? 0.2 : 0.55, rng)
    if (useChow) {
      const chow = tryAllocateChow(allocator, rng)
      if (chow) {
        concealedSetTiles.push(...chow.tiles)
        continue
      }
    }
    const preferHonor = options.preferHonorSets && chance(0.6, rng)
    let pung: { typeId: TileTypeId; tiles: TileInstanceId[] } | null = null
    if (preferHonor) {
      const honorCandidates = shuffle(HONOR_TYPE_IDS, rng)
      for (const typeId of honorCandidates) {
        if (allocator.remaining(typeId) >= 3) {
          pung = { typeId, tiles: allocator.take(typeId, 3) }
          break
        }
      }
    }
    pung ??= tryAllocatePungLike(allocator, 3, rng)
    if (!pung) {
      const chow = tryAllocateChow(allocator, rng)
      if (!chow) throw new Error('generateStandardHand: exhausted tile budget building a concealed set')
      concealedSetTiles.push(...chow.tiles)
      continue
    }
    concealedSetTiles.push(...pung.tiles)
  }

  const pairTiles = tryAllocatePair(allocator, rng)
  if (!pairTiles) throw new Error('generateStandardHand: exhausted tile budget building the pair')

  const concealedTiles = shuffle([...concealedSetTiles, ...pairTiles], rng)

  if (!isWinningHand(concealedTiles, melds)) {
    throw new Error(
      `generateStandardHand: constructed hand is not recognized as winning by the engine's own isWinningHand — generator bug. seed=${seed} concealedTiles=${JSON.stringify(concealedTiles)} melds=${JSON.stringify(melds)}`,
    )
  }

  const winningTile = pickWinningTile(concealedTiles, rng)
  const circumstance = randomWinCircumstance(rng, concealedTiles, melds, winningTile)

  return {
    seed,
    label: 'standard',
    concealedTiles,
    melds,
    winningTile,
    flowerCount: 0,
    ...circumstance,
  }
}

export function pickAny<T>(items: readonly T[], rng: Rng): T {
  return pick(items, rng)
}
