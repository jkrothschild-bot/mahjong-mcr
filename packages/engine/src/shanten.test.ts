import { describe, expect, it } from 'vitest'
import type { Meld } from './meld.js'
import { standardShanten } from './shanten.js'
import { TILE_TYPE_BY_ID, typeIdOfInstance, type TileTypeId } from './tiles.js'

// Same idsFor helper convention used across the engine's other test files.
function idsFor(typeId: TileTypeId, count: number): number[] {
  const ids: number[] = []
  for (let i = 0; i < TILE_TYPE_BY_ID.length && ids.length < count; i++) {
    if (typeIdOfInstance(i) === typeId) ids.push(i)
  }
  if (ids.length < count) throw new Error(`Not enough tiles of type ${typeId} (wanted ${count})`)
  return ids
}

function exposedPung(id: string, typeId: TileTypeId): Meld {
  return { id, kind: 'pung', exposure: 'exposed', tiles: idsFor(typeId, 3), ownerSeat: 0 }
}

describe('standardShanten', () => {
  it('scores -1 (agari) for a complete concealed hand', () => {
    // Same fixture as win-detection.test.ts's "recognizes a full concealed
    // 4-sets-plus-pair hand": chow(C1,C2,C3) + chow(D4,D5,D6) +
    // chow(B7,B8,B9) + pung(DW) + pair(C2,C2).
    const concealed = [
      ...idsFor('C1', 1),
      ...idsFor('C3', 1),
      ...idsFor('D4', 1),
      ...idsFor('D5', 1),
      ...idsFor('D6', 1),
      ...idsFor('B7', 1),
      ...idsFor('B8', 1),
      ...idsFor('B9', 1),
      ...idsFor('DW', 3),
      ...idsFor('C2', 3),
    ]
    expect(concealed.length).toBe(14)
    expect(standardShanten(concealed, [])).toBe(-1)
  })

  it('scores 0 (tenpai) for win-detection.test.ts\'s bare 13-tile tenpai fixture', () => {
    // "rejects a bare 13-tile tenpai hand" there — isWinningHand is false
    // (correctly, it's not complete), but shanten should be exactly 0.
    const concealed = [
      ...idsFor('C1', 1),
      ...idsFor('C3', 1),
      ...idsFor('D4', 1),
      ...idsFor('D5', 1),
      ...idsFor('D6', 1),
      ...idsFor('B7', 1),
      ...idsFor('B8', 1),
      ...idsFor('B9', 1),
      ...idsFor('DW', 3),
      ...idsFor('C2', 2),
    ]
    expect(concealed.length).toBe(13)
    expect(standardShanten(concealed, [])).toBe(0)
  })

  it('scores 0 (tenpai) for moves.test.ts\'s tenpaiWaitingOnC5 fixture', () => {
    // chow(C3,C4,+C5) + chow(D4,D5,D6) + chow(B7,B8,B9) + pung(DW×3) + pair(C9,C9).
    const concealed = [
      ...idsFor('C3', 1),
      ...idsFor('C4', 1),
      ...idsFor('D4', 1),
      ...idsFor('D5', 1),
      ...idsFor('D6', 1),
      ...idsFor('B7', 1),
      ...idsFor('B8', 1),
      ...idsFor('B9', 1),
      ...idsFor('DW', 3),
      ...idsFor('C9', 2),
    ]
    expect(concealed.length).toBe(13)
    expect(standardShanten(concealed, [])).toBe(0)
  })

  it('scores 1 when one useful tile is swapped for a truly isolated one', () => {
    // Same shape as tenpaiWaitingOnC5, but C4 (which paired with C3 into a
    // taatsu) is replaced by an isolated North Wind with no adjacency to
    // anything else in the hand — one step further back than tenpai.
    const concealed = [
      ...idsFor('C3', 1),
      ...idsFor('WN', 1),
      ...idsFor('D4', 1),
      ...idsFor('D5', 1),
      ...idsFor('D6', 1),
      ...idsFor('B7', 1),
      ...idsFor('B8', 1),
      ...idsFor('B9', 1),
      ...idsFor('DW', 3),
      ...idsFor('C9', 2),
    ]
    expect(concealed.length).toBe(13)
    expect(standardShanten(concealed, [])).toBe(1)
  })

  it('scores the theoretical maximum (8) for 13 fully isolated tiles with no melds', () => {
    // No two tiles adjacent (gaps of 3+), no honors repeated, no pair at all.
    const concealed = [
      ...idsFor('C1', 1),
      ...idsFor('C4', 1),
      ...idsFor('C7', 1),
      ...idsFor('D1', 1),
      ...idsFor('D4', 1),
      ...idsFor('D7', 1),
      ...idsFor('B1', 1),
      ...idsFor('B4', 1),
      ...idsFor('B7', 1),
      ...idsFor('WE', 1),
      ...idsFor('WS', 1),
      ...idsFor('WW', 1),
      ...idsFor('WN', 1),
    ]
    expect(concealed.length).toBe(13)
    expect(standardShanten(concealed, [])).toBe(8)
  })

  it('accounts for existing melds (each counts as one complete set, reducing sets needed)', () => {
    const meld = exposedPung('0-0', 'WE')
    // chow(D4,D5,D6) + chow(B7,B8,B9) + pair(C9,C9) + taatsu(C3,C4) — tenpai
    // waiting on C2 or C5, with 1 meld already filling a 4th set.
    const concealed = [
      ...idsFor('D4', 1),
      ...idsFor('D5', 1),
      ...idsFor('D6', 1),
      ...idsFor('B7', 1),
      ...idsFor('B8', 1),
      ...idsFor('B9', 1),
      ...idsFor('C9', 2),
      ...idsFor('C3', 1),
      ...idsFor('C4', 1),
    ]
    expect(concealed.length + meld.tiles.length).toBe(13)
    expect(standardShanten(concealed, [meld])).toBe(0)
  })
})
