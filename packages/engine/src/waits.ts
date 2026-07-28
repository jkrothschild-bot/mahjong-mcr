import type { Meld } from './meld.js'
import { scoreHand, type ScoreHandParams } from './scoring/score-hand.js'
import type { ScoreResult } from './scoring/types.js'
import { calculateShanten } from './shanten.js'
import { TILE_TYPE_BY_ID, typeIdOfInstance, type TileInstanceId, type TileTypeId, type Wind } from './tiles.js'
import { isWinningHand, ORDERED_STANDARD_TYPE_IDS } from './win-detection.js'

// Borrows any existing same-type instance id purely to probe completeness —
// safe because isWinningHand/decomposeHand/scoreHand only ever read a
// tile's *type* (via groupConcealedByType/typeIdOfInstance), never which
// specific physical copy is used, so this never touches those modules'
// trusted logic. Every standard type has all 4 copies in the canonical
// table, so this always finds one.
function firstInstanceOfType(typeId: TileTypeId): TileInstanceId {
  for (let i = 0; i < TILE_TYPE_BY_ID.length; i++) {
    if (typeIdOfInstance(i) === typeId) return i
  }
  throw new Error(`No instance found for standard type ${typeId}`)
}

export interface WaitOption {
  tileType: TileTypeId
  discardScore: ScoreResult
  selfDrawScore: ScoreResult
}

export interface WinCircumstanceContext {
  prevailingWind?: Wind
  seatWind?: Wind
}

// The ready-hand/waits display: only meaningful at shanten 0 (tenpai) — []
// otherwise. For each of the 34 standard types, checks whether adding it
// completes the hand, and if so scores it via the existing (M2, unchanged)
// scoreHand — twice, since some fans differ by win method (e.g. self-draw-
// only fans), so the UI can show "if drawn" vs. "if discarded to you"
// without this module guessing which is more relevant.
export function computeWaits(
  concealedTiles: readonly TileInstanceId[],
  melds: readonly Meld[],
  context: WinCircumstanceContext = {},
): WaitOption[] {
  if (calculateShanten(concealedTiles, melds).shanten !== 0) return []

  const options: WaitOption[] = []
  for (const tileType of ORDERED_STANDARD_TYPE_IDS) {
    const candidateTile = firstInstanceOfType(tileType)
    const candidateConcealed = [...concealedTiles, candidateTile]
    if (!isWinningHand(candidateConcealed, melds)) continue

    const shared: Omit<ScoreHandParams, 'winMethod'> = {
      concealedTiles: candidateConcealed,
      melds: [...melds],
      winningTile: candidateTile,
      prevailingWind: context.prevailingWind,
      seatWind: context.seatWind,
    }
    options.push({
      tileType,
      discardScore: scoreHand({ ...shared, winMethod: 'discard' }),
      selfDrawScore: scoreHand({ ...shared, winMethod: 'selfDraw' }),
    })
  }
  return options
}
