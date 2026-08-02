import type { MeldId, Seat } from './meld.js'
import type { TileInstanceId } from './tiles.js'

// The persisted, append-only replay log. Every field needed to reconstruct
// exact state is present in the entry itself (e.g. `draw.tile` is recorded
// explicitly, not left to be re-derived from wall pointer state) so the future
// M6 replay scrubber can describe any entry standalone ("seat 2 drew
// 5-dot") without cross-referencing wall state.
export interface BaseAction {
  seq: number
  seat: Seat
  timestamp?: number
}

export type Action =
  | (BaseAction & { type: 'deal'; hands: Record<Seat, TileInstanceId[]> })
  | (BaseAction & { type: 'draw'; tile: TileInstanceId; source: 'front' | 'back' })
  | (BaseAction & { type: 'flowerReplacement'; flowerTile: TileInstanceId; replacementTile: TileInstanceId })
  | (BaseAction & { type: 'discard'; tile: TileInstanceId })
  | (BaseAction & {
      type: 'claim'
      claimType: 'chow' | 'pung' | 'kong'
      claimedTile: TileInstanceId
      fromSeat: Seat
      usedConcealedTiles: TileInstanceId[]
      meldId: MeldId
    })
  | (BaseAction & { type: 'concealedKong'; tiles: TileInstanceId[]; meldId: MeldId })
  | (BaseAction & { type: 'addedKong'; meldId: MeldId; addedTile: TileInstanceId })
  | (BaseAction & { type: 'robKongWin'; meldIdBeingRobbed: MeldId; tile: TileInstanceId })
  | (BaseAction & {
      type: 'win'
      winTile: TileInstanceId
      winMethod: 'selfDraw' | 'discard' | 'robKong'
      discardSeat?: Seat
    })
  | (BaseAction & { type: 'exhaustiveDraw' })
  | (BaseAction & { type: 'pass'; declinedOptions: ('chow' | 'pung' | 'kong' | 'win')[] })
