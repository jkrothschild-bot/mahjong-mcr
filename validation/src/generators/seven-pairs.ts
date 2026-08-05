// Seven Pairs (win-detection.ts shape 2): 7 distinct pair types, no melds.
// Occasionally builds "Seven Shifted Pairs" (fan 6, a strictly stricter
// shape — same suit, 7 consecutive ranks) since pure-random Seven Pairs
// essentially never lands on it by chance, and it's an 88-point fan worth
// deliberately exercising.
import { isWinningHand, shuffle, type Rng } from '@mahjong-mcr/engine'
import type { GeneratedCase } from '../case-types.js'
import { ALL_STANDARD_TYPE_IDS, TileAllocator, chance } from '../hand-helpers.js'
import { pickWinningTile, randomWinCircumstance } from '../win-circumstance.js'

const SUITS = ['C', 'D', 'B'] as const

export function generateSevenPairsHand(seed: number, rng: Rng): GeneratedCase {
  const allocator = new TileAllocator()
  let types: string[]
  let label: string

  if (chance(0.3, rng)) {
    // Seven Shifted Pairs: one suit, 7 consecutive ranks (only rank-1..3 can
    // start a run of 7 within 1..9).
    const suit = SUITS[Math.floor(rng.next() * SUITS.length)]!
    const startRank = 1 + Math.floor(rng.next() * 3)
    types = Array.from({ length: 7 }, (_, i) => `${suit}${startRank + i}`)
    label = 'seven-shifted-pairs'
  } else {
    types = shuffle(ALL_STANDARD_TYPE_IDS, rng).slice(0, 7)
    label = 'seven-pairs'
  }

  const concealedTiles = types.flatMap((t) => allocator.take(t, 2))
  const shuffled = shuffle(concealedTiles, rng)

  if (!isWinningHand(shuffled, [])) {
    throw new Error(`generateSevenPairsHand: constructed hand is not winning — generator bug. seed=${seed} tiles=${JSON.stringify(shuffled)}`)
  }

  const winningTile = pickWinningTile(shuffled, rng)
  const circumstance = randomWinCircumstance(rng, shuffled, [], winningTile)

  return { seed, label, concealedTiles: shuffled, melds: [], winningTile, flowerCount: 0, ...circumstance }
}
