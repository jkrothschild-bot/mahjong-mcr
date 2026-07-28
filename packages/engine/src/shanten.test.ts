import { describe, expect, it } from 'vitest'
import type { Meld } from './meld.js'
import { calculateShanten, sevenPairsShanten, standardShanten, thirteenOrphansShanten } from './shanten.js'
import { isWinningHand } from './win-detection.js'
import { mulberry32 } from './rng.js'
import { playRandomHand } from './testing/random-agent.js'
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

describe('sevenPairsShanten', () => {
  it('scores -1 (agari) for 7 complete distinct pairs', () => {
    const concealed = [
      ...idsFor('C1', 2),
      ...idsFor('C4', 2),
      ...idsFor('C7', 2),
      ...idsFor('D1', 2),
      ...idsFor('D4', 2),
      ...idsFor('D7', 2),
      ...idsFor('B1', 2),
    ]
    expect(concealed.length).toBe(14)
    expect(sevenPairsShanten(concealed, [])).toBe(-1)
  })

  it('scores 0 (tenpai) for 6 pairs plus a single of a 7th distinct kind', () => {
    const concealed = [
      ...idsFor('C1', 2),
      ...idsFor('C4', 2),
      ...idsFor('C7', 2),
      ...idsFor('D1', 2),
      ...idsFor('D4', 2),
      ...idsFor('D7', 2),
      ...idsFor('B1', 1),
    ]
    expect(concealed.length).toBe(13)
    expect(sevenPairsShanten(concealed, [])).toBe(0)
  })

  it('applies the "not enough distinct kinds" correction (max(0, 7-kinds))', () => {
    // Only 4 distinct kinds total (13 tiles) — even with lots of
    // duplication, there aren't enough different kinds to ever reach 7
    // distinct pairs, so the shanten should be worse than a naive 6-pairs
    // reading would suggest.
    const concealed = [...idsFor('C1', 4), ...idsFor('C2', 4), ...idsFor('C3', 4), ...idsFor('C4', 1)]
    expect(concealed.length).toBe(13)
    // pairs=3 (C1,C2,C3 each count as exactly 1 pair despite 4 copies), kinds=4
    // shanten = 6 - 3 + max(0, 7-4) = 6
    expect(sevenPairsShanten(concealed, [])).toBe(6)
  })

  it('is never valid (+Infinity) with any meld present, matching isSevenPairs\' own restriction', () => {
    const meld = exposedPung('0-0', 'WE')
    expect(sevenPairsShanten([...idsFor('C1', 2)], [meld])).toBe(Infinity)
  })
})

describe('thirteenOrphansShanten', () => {
  it('scores -1 (agari) for a complete hand: 12 singles + 1 pair among the 13 required types', () => {
    const concealed = [
      ...idsFor('C1', 2),
      ...idsFor('C9', 1),
      ...idsFor('D1', 1),
      ...idsFor('D9', 1),
      ...idsFor('B1', 1),
      ...idsFor('B9', 1),
      ...idsFor('WE', 1),
      ...idsFor('WS', 1),
      ...idsFor('WW', 1),
      ...idsFor('WN', 1),
      ...idsFor('DR', 1),
      ...idsFor('DG', 1),
      ...idsFor('DW', 1),
    ]
    expect(concealed.length).toBe(14)
    expect(thirteenOrphansShanten(concealed, [])).toBe(-1)
  })

  it('scores 0 (tenpai) for the classic 13-way wait: all 13 types as singles, no pair', () => {
    const concealed = [
      ...idsFor('C1', 1),
      ...idsFor('C9', 1),
      ...idsFor('D1', 1),
      ...idsFor('D9', 1),
      ...idsFor('B1', 1),
      ...idsFor('B9', 1),
      ...idsFor('WE', 1),
      ...idsFor('WS', 1),
      ...idsFor('WW', 1),
      ...idsFor('WN', 1),
      ...idsFor('DR', 1),
      ...idsFor('DG', 1),
      ...idsFor('DW', 1),
    ]
    expect(concealed.length).toBe(13)
    expect(thirteenOrphansShanten(concealed, [])).toBe(0)
  })

  it('scores 0 (tenpai) for an ordinary kokushi tenpai: 12 distinct types, one doubled', () => {
    const concealed = [
      ...idsFor('C1', 2),
      ...idsFor('C9', 1),
      ...idsFor('D1', 1),
      ...idsFor('D9', 1),
      ...idsFor('B1', 1),
      ...idsFor('B9', 1),
      ...idsFor('WE', 1),
      ...idsFor('WS', 1),
      ...idsFor('WW', 1),
      ...idsFor('WN', 1),
      ...idsFor('DR', 1),
      ...idsFor('DG', 1),
    ]
    expect(concealed.length).toBe(13)
    expect(thirteenOrphansShanten(concealed, [])).toBe(0)
  })

  it('scores worse the fewer of the 13 required kinds are present', () => {
    const concealed = [
      ...idsFor('C1', 1),
      ...idsFor('C9', 1),
      ...idsFor('D1', 1),
      ...idsFor('D9', 1),
      ...idsFor('B1', 1),
      ...idsFor('B9', 1),
      ...idsFor('WE', 1),
      ...idsFor('WS', 1),
      ...idsFor('WW', 1),
      ...idsFor('WN', 1),
      ...idsFor('C5', 3), // filler, not one of the 13 required types
    ]
    expect(concealed.length).toBe(13)
    // kinds=10, hasPair=false -> shanten = 13 - 10 - 0 = 3
    expect(thirteenOrphansShanten(concealed, [])).toBe(3)
  })

  it('is never valid (+Infinity) with any meld present, matching isThirteenOrphans\' own restriction', () => {
    const meld = exposedPung('0-0', 'WE')
    expect(thirteenOrphansShanten([...idsFor('C1', 1)], [meld])).toBe(Infinity)
  })
})

describe('calculateShanten', () => {
  it('picks the standard shape when it is the best (a normal chow/pung hand)', () => {
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
    const result = calculateShanten(concealed, [])
    expect(result).toEqual({ shanten: 0, shape: 'standard' })
  })

  it('picks Seven Pairs when it beats the standard shape (a pairs-heavy hand)', () => {
    const concealed = [
      ...idsFor('C1', 2),
      ...idsFor('C4', 2),
      ...idsFor('C7', 2),
      ...idsFor('D1', 2),
      ...idsFor('D4', 2),
      ...idsFor('D7', 2),
      ...idsFor('B1', 1),
    ]
    expect(concealed.length).toBe(13)
    const result = calculateShanten(concealed, [])
    expect(result).toEqual({ shanten: 0, shape: 'sevenPairs' })
  })

  it('picks Thirteen Orphans when it beats the standard shape (an orphans-heavy hand)', () => {
    const concealed = [
      ...idsFor('C1', 2),
      ...idsFor('C9', 1),
      ...idsFor('D1', 1),
      ...idsFor('D9', 1),
      ...idsFor('B1', 1),
      ...idsFor('B9', 1),
      ...idsFor('WE', 1),
      ...idsFor('WS', 1),
      ...idsFor('WW', 1),
      ...idsFor('WN', 1),
      ...idsFor('DR', 1),
      ...idsFor('DG', 1),
    ]
    const result = calculateShanten(concealed, [])
    expect(result).toEqual({ shanten: 0, shape: 'thirteenOrphans' })
  })

  // Ties the new code back to the already-trusted M1 win-detection logic
  // rather than asserting only against itself: a hand is "won" (shanten
  // <= -1) if and only if isWinningHand agrees, sampled across many seeded
  // random hands, reusing the existing playRandomHand harness rather than
  // building new hand-generation infrastructure. Uniform-random play almost
  // never organically produces a natural win within a single hand (see
  // property.test.ts's own note on this) — this test's job is checking for
  // false positives/negatives across many *non-winning* intermediate hands;
  // the next test below covers the winning case explicitly and directly.
  it('agrees with isWinningHand across many sampled non-winning hands (no false positives/negatives)', () => {
    const SEED_COUNT = 30
    let sampledNonWins = 0

    for (let seed = 0; seed < SEED_COUNT; seed++) {
      const agentRng = mulberry32(seed * 104729 + 11)
      playRandomHand({
        seed,
        handNumber: 1,
        prevailingWind: 'east',
        dealerSeat: 0,
        agentRng,
        onMove: (seat, _move, state) => {
          const player = state.players[seat]
          const isWin = isWinningHand(player.hand.concealedTiles, player.hand.melds)
          const shanten = calculateShanten(player.hand.concealedTiles, player.hand.melds).shanten
          if (!isWin) sampledNonWins++
          expect(shanten <= -1).toBe(isWin)
        },
      })
    }

    expect(sampledNonWins).toBeGreaterThan(0)
  })

  it('agrees with isWinningHand for an explicit, guaranteed-complete hand', () => {
    const concealed = [
      ...idsFor('C3', 1),
      ...idsFor('C4', 1),
      ...idsFor('C5', 1),
      ...idsFor('D4', 1),
      ...idsFor('D5', 1),
      ...idsFor('D6', 1),
      ...idsFor('B7', 1),
      ...idsFor('B8', 1),
      ...idsFor('B9', 1),
      ...idsFor('DW', 3),
      ...idsFor('C9', 2),
    ]
    expect(concealed.length).toBe(14)
    expect(isWinningHand(concealed, [])).toBe(true)
    expect(calculateShanten(concealed, []).shanten).toBe(-1)
  })
})
