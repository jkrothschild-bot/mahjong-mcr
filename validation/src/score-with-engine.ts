import { scoreHand, type ScoreResult } from '@mahjong-mcr/engine'
import type { GeneratedCase } from './case-types.js'

export function scoreWithEngine(hand: GeneratedCase): ScoreResult {
  return scoreHand({
    concealedTiles: hand.concealedTiles,
    melds: hand.melds,
    winMethod: hand.winMethod,
    isLastTileOfWall: hand.isLastTileOfWall,
    isLastDiscardOfGame: hand.isLastDiscardOfGame,
    wonOnKongReplacement: hand.wonOnKongReplacement,
    isLastCopyOfItsKind: hand.isLastCopyOfItsKind,
    prevailingWind: hand.prevailingWind,
    seatWind: hand.seatWind,
    winningTile: hand.winningTile,
  })
}
