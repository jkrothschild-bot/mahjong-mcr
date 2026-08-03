import { typeIdOfInstance, type TileInstanceId, type TileTypeId, type WinningShape } from '@mahjong-mcr/engine'
import { sortByMode, sortKey } from './handOrder.js'

// How a seat's concealed tiles are ordered once the hand ends and everything
// turns face-up.
//
// Mid-hand this question doesn't exist: bots show backs, and the human's own
// order is theirs (CLAUDE.md — player-controlled, never auto-sorted). At
// reveal the hand is over and the tiles become something to READ, so:
//
//   - every non-winning seat is sorted by suit, so a run of 13 tiles can
//     actually be scanned;
//   - the winner's hand is laid out in the groups it was won with — four
//     sets then the pair, or seven pairs as pairs — because "how did that
//     win work?" is the single most useful thing the board can answer at
//     that moment, and it's the reason this is a trainer.
//
// Display only. Nothing here writes back to the engine or to the human's
// stored hand order; the next deal starts from a clean order regardless.

// sortByMode's stability means two same-type tiles keep their relative INPUT
// order — exactly right for the player's own hand (CLAUDE.md: player-
// controlled order), but wrong here: reveal must render identically no
// matter what order the tiles happen to sit in (draw order, prior drag
// history, etc). Pre-sorting by the numeric instance id gives the stable
// sort a fixed, input-order-independent tiebreak for duplicate types.
function canonicalize(tiles: readonly TileInstanceId[]): TileInstanceId[] {
  return tiles.slice().sort((a, b) => a - b)
}

function byTypeQueues(tiles: readonly TileInstanceId[]): Map<TileTypeId, TileInstanceId[]> {
  const queues = new Map<TileTypeId, TileInstanceId[]>()
  // Suit-sorted first so that which physical copy of a type lands in which
  // group is deterministic rather than dependent on draw order — two
  // identical hands must render identically.
  for (const id of sortByMode(canonicalize(tiles), 'suit')) {
    const typeId = typeIdOfInstance(id)
    const queue = queues.get(typeId)
    if (queue) queue.push(id)
    else queues.set(typeId, [id])
  }
  return queues
}

function takeOne(queues: Map<TileTypeId, TileInstanceId[]>, typeId: TileTypeId): TileInstanceId | null {
  const queue = queues.get(typeId)
  if (!queue || queue.length === 0) return null
  return queue.shift()!
}

function drain(queues: Map<TileTypeId, TileInstanceId[]>): TileInstanceId[] {
  return sortByMode([...queues.values()].flat(), 'suit')
}

// Seven Pairs / Thirteen Orphans carry no set structure — specialShape is
// just a tag — so they're regrouped from the tiles themselves. A plain suit
// sort already does the right thing for both: it puts identical tiles
// adjacent, which IS the pair grouping for Seven Pairs, and for Thirteen
// Orphans it lines up the 13 terminals/honors in order with the doubled one
// sitting as a visible pair.
function orderSpecialShape(tiles: readonly TileInstanceId[]): TileInstanceId[] {
  return sortByMode(canonicalize(tiles), 'suit')
}

export function revealOrder(
  tiles: readonly TileInstanceId[],
  shape: WinningShape | null | undefined,
): TileInstanceId[] {
  if (!shape) return sortByMode(canonicalize(tiles), 'suit')
  if (shape.specialShape) return orderSpecialShape(tiles)

  const decomposition = shape.decomposition
  if (!decomposition) return sortByMode(canonicalize(tiles), 'suit')

  const queues = byTypeQueues(tiles)
  const ordered: TileInstanceId[] = []

  // Sets before the pair, ordered by their own STARTING RANK and only then by
  // suit — sortKey('number', ...) is exactly [rank, suitIndex], with honors
  // sorting after rank 9.
  //
  // Rank-major specifically, not suit-major. The straight family (Mixed
  // Straight, Pure Straight, and the shifted-chow fans) is the whole reason
  // this grouping exists, and a Mixed Straight's three chows — 1-2-3, 4-5-6,
  // 7-8-9 — are each in a DIFFERENT suit. Ordering by suit therefore
  // reshuffles them into suit order and destroys the very progression the fan
  // is named for: a hand scored "Mixed Straight" rendered as 7-8-9, 1-2-3,
  // 4-5-6 teaches the player nothing. This was the first version's bug.
  //
  // Ordering within a set is left exactly as the decomposition states it, so
  // a chow always reads low-to-high.
  //
  // Deliberately not decomposeHand's own emission order either: findSets
  // happens to emit ascending today, but that's an implementation detail of
  // its lowest-type-first search, not a guarantee.
  const sets = [...decomposition.sets].sort((a, b) => {
    const ka = sortKey('number', a.tiles[0])
    const kb = sortKey('number', b.tiles[0])
    for (let i = 0; i < ka.length; i++) {
      const diff = ka[i]! - kb[i]!
      if (diff !== 0) return diff
    }
    return 0
  })

  for (const set of sets) {
    for (const typeId of set.tiles) {
      const id = takeOne(queues, typeId)
      // Missing is expected, not a bug: a win off a discard scores with the
      // winning tile folded in (deriveScoreHandParams appends it), but that
      // tile physically sits in the discarder's river and is never in the
      // winner's rendered hand. So a group can legitimately be one tile short
      // of what the decomposition describes. Draw what's there.
      if (id !== null) ordered.push(id)
    }
  }
  for (let i = 0; i < 2; i++) {
    const id = takeOne(queues, decomposition.pair)
    if (id !== null) ordered.push(id)
  }

  // Anything the decomposition didn't account for goes last, suit-sorted, so
  // a tile can never be silently dropped from the display even if the parse
  // and the rendered hand disagree.
  return [...ordered, ...drain(queues)]
}
