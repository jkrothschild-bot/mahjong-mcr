import { typeIdOfInstance, type TileInstanceId } from './tiles.js'

export type Seat = 0 | 1 | 2 | 3

export type MeldKind = 'chow' | 'pung' | 'kong'
export type MeldExposure = 'concealed' | 'exposed'
export type KongSource = 'concealed' | 'exposedFromDiscard' | 'promotedFromPung'

export type MeldId = string

export interface Meld {
  id: MeldId
  kind: MeldKind
  exposure: MeldExposure
  // present iff kind === 'kong'
  kongSource?: KongSource
  // 3 tiles for chow/pung; 4 for kong (a promoted kong is the original 3 +
  // the added 4th, appended in order).
  tiles: TileInstanceId[]
  ownerSeat: Seat
  // present for chow/pung/exposedFromDiscard-kong; absent for concealed
  // kong and promotedFromPung (the promotion itself is a self-move, though
  // the underlying pung it upgrades may itself have been claimed earlier).
  claimedFrom?: { seat: Seat; discardTile: TileInstanceId }
}

export function nextMeldId(ownerSeat: Seat, existingMelds: readonly Meld[]): MeldId {
  const countForSeat = existingMelds.filter((m) => m.ownerSeat === ownerSeat).length
  return `${ownerSeat}-${countForSeat}`
}

// A kong counts as exactly one "set" for win-detection purposes, despite
// having 4 physical tiles — see win-detection.ts.
export function isKong(meld: Meld): boolean {
  return meld.kind === 'kong'
}

export function meldTileTypeId(meld: Meld): string {
  const first = meld.tiles[0]
  if (first === undefined) throw new Error(`Meld ${meld.id} has no tiles`)
  return typeIdOfInstance(first)
}
