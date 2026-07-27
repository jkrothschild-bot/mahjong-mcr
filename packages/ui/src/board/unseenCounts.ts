import { typeIdOfInstance, type GameState, type Seat, type TileTypeId } from '@mahjong-mcr/engine'
import { ALL_TILE_TYPE_IDS } from './tileNames.js'

// How many copies of each of the 34 standard tile types remain unseen —
// SPEC.md §5's tile inspector ("how many are in discards/melds, how many
// remain unseen") and §9's tile-count grid share this exact derivation.
// Counts the human's OWN concealed tiles plus every seat's discards and
// exposed meld tiles — deliberately never counts a bot's hidden concealed
// tiles, which would leak information the player couldn't actually have.
export function computeUnseenCounts(state: GameState, humanSeat: Seat): Record<TileTypeId, number> {
  const visible = new Map<TileTypeId, number>()

  const tally = (typeId: TileTypeId) => visible.set(typeId, (visible.get(typeId) ?? 0) + 1)

  for (const tile of state.players[humanSeat].hand.concealedTiles) {
    tally(typeIdOfInstance(tile))
  }
  for (const player of state.players) {
    for (const tile of player.discards) tally(typeIdOfInstance(tile))
    for (const meld of player.hand.melds) {
      for (const tile of meld.tiles) tally(typeIdOfInstance(tile))
    }
  }

  const result: Record<TileTypeId, number> = {}
  for (const typeId of ALL_TILE_TYPE_IDS) {
    result[typeId] = Math.max(0, 4 - (visible.get(typeId) ?? 0))
  }
  return result
}
