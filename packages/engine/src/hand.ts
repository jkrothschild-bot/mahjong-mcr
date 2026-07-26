import type { Meld, MeldId } from './meld.js'
import type { TileInstanceId } from './tiles.js'

export interface Hand {
  // Only the 34 standard tile types ever appear here — flowers/seasons are
  // bucketed separately and never part of hand-shape decomposition.
  concealedTiles: TileInstanceId[]
  melds: Meld[]
  flowers: TileInstanceId[]
}

export function emptyHand(): Hand {
  return { concealedTiles: [], melds: [], flowers: [] }
}

export function addToConcealed(hand: Hand, tile: TileInstanceId): Hand {
  return { ...hand, concealedTiles: [...hand.concealedTiles, tile] }
}

export function addFlower(hand: Hand, tile: TileInstanceId): Hand {
  return { ...hand, flowers: [...hand.flowers, tile] }
}

// Removes each of `tiles` from concealedTiles (one physical instance per
// entry — duplicates in `tiles` remove that many copies). Throws if any
// requested tile isn't present, since that would indicate a caller bug
// (e.g. claiming with tiles the hand doesn't actually hold).
export function removeFromConcealed(hand: Hand, tiles: readonly TileInstanceId[]): Hand {
  const remaining = hand.concealedTiles.slice()
  for (const tile of tiles) {
    const index = remaining.indexOf(tile)
    if (index === -1) {
      throw new Error(`Tile ${tile} is not in the concealed hand`)
    }
    remaining.splice(index, 1)
  }
  return { ...hand, concealedTiles: remaining }
}

// Adds a new meld and removes the concealed tiles it consumed, in one step
// (used for chow/pung/kong-from-discard and concealed kong).
export function addMeld(hand: Hand, meld: Meld, consumedConcealedTiles: readonly TileInstanceId[]): Hand {
  const withoutConsumed = removeFromConcealed(hand, consumedConcealedTiles)
  return { ...withoutConsumed, melds: [...withoutConsumed.melds, meld] }
}

// Upgrades an existing exposed pung meld to a kong by appending the added
// tile, removing it from the concealed hand.
export function promoteMeldToKong(hand: Hand, meldId: MeldId, addedTile: TileInstanceId): Hand {
  const meldIndex = hand.melds.findIndex((m) => m.id === meldId)
  const meld = hand.melds[meldIndex]
  if (meldIndex === -1 || !meld) throw new Error(`No meld with id ${meldId}`)
  if (meld.kind !== 'pung') throw new Error(`Meld ${meldId} is not a pung, cannot promote to kong`)

  const withoutAdded = removeFromConcealed(hand, [addedTile])
  const promoted: Meld = {
    ...meld,
    kind: 'kong',
    kongSource: 'promotedFromPung',
    tiles: [...meld.tiles, addedTile],
  }
  const melds = withoutAdded.melds.slice()
  melds[meldIndex] = promoted
  return { ...withoutAdded, melds }
}

// concealedTiles.length + Σ meld.tiles.length === 13 + (#kong melds), except
// transiently between a draw and the following discard/kong-declaration,
// when it's one higher. Exposed here so tests (and the engine itself, if it
// ever wants to assert invariants defensively) can check it directly.
export function handTileCount(hand: Hand): number {
  return hand.concealedTiles.length + hand.melds.reduce((sum, m) => sum + m.tiles.length, 0)
}

export function expectedHandTileCount(hand: Hand, extraDrawnTile: boolean): number {
  const kongCount = hand.melds.filter((m) => m.kind === 'kong').length
  return 13 + kongCount + (extraDrawnTile ? 1 : 0)
}
