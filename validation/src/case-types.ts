import type { Meld, TileInstanceId, Wind } from '@mahjong-mcr/engine'

// One generated, verified-winning hand plus every piece of context M2's fan
// detectors (or PyMahjongGB) might need — see KICKOFF-validation-harness.md
// 1a's field list. `label` records which generator produced it (structure
// name, or the targeted fan it aims at) purely for coverage/debugging
// output; it plays no role in scoring either side.
export interface GeneratedCase {
  seed: number
  label: string
  concealedTiles: TileInstanceId[] // winning tile included, per HandContext's own contract
  melds: Meld[]
  winningTile: TileInstanceId
  winMethod: 'selfDraw' | 'discard' | 'robKong'
  isLastTileOfWall: boolean
  isLastDiscardOfGame: boolean
  wonOnKongReplacement: boolean
  isLastCopyOfItsKind: boolean
  prevailingWind: Wind
  seatWind: Wind
  // Always 0 in every case this harness generates — see generate.ts's header
  // comment for why flowers are out of scope for Stage 1's comparison.
  flowerCount: 0
}
