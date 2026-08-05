// Thirteen Orphans (win-detection.ts shape 3, THIRTEEN_ORPHAN_TYPE_IDS):
// all 13 terminal/honor types as singles, plus one of them doubled.
import { THIRTEEN_ORPHAN_TYPE_IDS, isWinningHand, shuffle, type Rng } from '@mahjong-mcr/engine'
import type { GeneratedCase } from '../case-types.js'
import { TileAllocator } from '../hand-helpers.js'
import { pickWinningTile, randomWinCircumstance } from '../win-circumstance.js'

export function generateThirteenOrphansHand(seed: number, rng: Rng): GeneratedCase {
  const allocator = new TileAllocator()
  const duplicated = THIRTEEN_ORPHAN_TYPE_IDS[Math.floor(rng.next() * THIRTEEN_ORPHAN_TYPE_IDS.length)]!

  const concealedTiles = THIRTEEN_ORPHAN_TYPE_IDS.flatMap((typeId) => allocator.take(typeId, typeId === duplicated ? 2 : 1))
  const shuffled = shuffle(concealedTiles, rng)

  if (!isWinningHand(shuffled, [])) {
    throw new Error(`generateThirteenOrphansHand: constructed hand is not winning — generator bug. seed=${seed} tiles=${JSON.stringify(shuffled)}`)
  }

  const winningTile = pickWinningTile(shuffled, rng)
  const circumstance = randomWinCircumstance(rng, shuffled, [], winningTile)

  return { seed, label: 'thirteen-orphans', concealedTiles: shuffled, melds: [], winningTile, flowerCount: 0, ...circumstance }
}
