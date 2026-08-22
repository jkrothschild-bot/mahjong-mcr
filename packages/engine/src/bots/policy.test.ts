import { describe, expect, it } from 'vitest'
import { applyMove, legalMoves } from '../moves.js'
import { seatWindFor, startHand, type GameState, type PlayerState } from '../game-state.js'
import { emptyHand, type Hand } from '../hand.js'
import { buildWall } from '../wall.js'
import { evaluateDiscards } from '../tile-efficiency.js'
import { TILE_TYPE_BY_ID, typeIdOfInstance, type TileInstanceId, type TileTypeId } from '../tiles.js'
import type { Seat } from '../meld.js'
import { BOT_PRESETS, chooseClaimMove, chooseDiscard, chooseMove } from './policy.js'

function idsFor(typeId: TileTypeId, count: number): TileInstanceId[] {
  const ids: TileInstanceId[] = []
  for (let i = 0; i < TILE_TYPE_BY_ID.length && ids.length < count; i++) {
    if (typeIdOfInstance(i) === typeId) ids.push(i)
  }
  if (ids.length < count) throw new Error(`Not enough tiles of type ${typeId} (wanted ${count})`)
  return ids
}

function handWith(concealedTiles: TileInstanceId[]): Hand {
  return { ...emptyHand(), concealedTiles }
}

function baseState(hands: [Hand, Hand, Hand, Hand], currentSeat: Seat = 0): GameState {
  const players = hands.map(
    (hand, seat): PlayerState => ({ seat: seat as Seat, seatWind: seatWindFor(seat as Seat, 0), hand, discards: [], score: 0 }),
  ) as [PlayerState, PlayerState, PlayerState, PlayerState]
  return {
    seed: 1,
    handNumber: 1,
    prevailingWind: 'east',
    dealerSeat: 0,
    wall: buildWall(1),
    players,
    currentSeat,
    phase: 'awaitingDiscard',
    actionLog: [],
  }
}

describe('chooseDiscard', () => {
  it('always achieves the minimum resultingShanten among all legal discards', () => {
    const tenpai13 = [
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
    const [isolated] = idsFor('WN', 1)
    const hand = handWith([...tenpai13, isolated!])

    const chosen = chooseDiscard(hand)
    const evaluations = evaluateDiscards(hand)
    const bestShanten = Math.min(...evaluations.map((e) => e.resultingShanten))
    const chosenEvaluation = evaluations.find((e) => e.tile === chosen)!
    expect(chosenEvaluation.resultingShanten).toBe(bestShanten)
  })
})

// Every scenario below was verified computationally (via the real engine,
// not hand-derived arithmetic — the block-cost shanten formula turned out
// to have enough subtlety around head-pair/budget interactions that manual
// derivation was unreliable) before being written down here.
describe('chooseClaimMove — preset divergence', () => {
  it("a genuinely shanten-neutral pung: 'conservative' (onlyImproving) declines it, 'efficient'/'balanced' (improvingOrNeutral) take it", () => {
    // pung(DW×3) + pung(DG×3) [S=2] + taatsu(C3,C4) + taatsu(D3,D4) [T=2,
    // budget saturated at S+T=4] + pair(C9,C9) reserved as head + 1 filler.
    // Claiming the pung consumes the reserved head pair itself (losing
    // P=1) while the vacated budget slot can only re-admit one of the two
    // OTHER taatsu (since n drops by 1 too) — net shanten unchanged (1->1).
    const concealed = [
      ...idsFor('DW', 3),
      ...idsFor('DG', 3),
      ...idsFor('C3', 1),
      ...idsFor('C4', 1),
      ...idsFor('D3', 1),
      ...idsFor('D4', 1),
      ...idsFor('C9', 2),
      ...idsFor('WN', 1),
    ]
    const [c9third] = idsFor('C9', 3).slice(2)
    const hands: [Hand, Hand, Hand, Hand] = [handWith([c9third!]), handWith(concealed), handWith([]), handWith([])]
    let state = baseState(hands, 0)
    state = applyMove(state, 0, { kind: 'discard', tile: c9third! })
    expect(legalMoves(state, 1).map((m) => m.kind).sort()).toEqual(['pass', 'pung'])

    expect(chooseClaimMove(state, 1, BOT_PRESETS.conservative)).toEqual({ kind: 'pass' })
    expect(chooseClaimMove(state, 1, BOT_PRESETS.efficient)).toEqual({ kind: 'pung' })
    expect(chooseClaimMove(state, 1, BOT_PRESETS.balanced)).toEqual({ kind: 'pung' })
  })

  it('every preset declines a chow that would lock the hand out of a better Seven Pairs shanten', () => {
    // 5 pairs (D1,D4,D7,B1,B4) + a standard-shape taatsu (C3,C4) + 1 filler
    // — shanten 1 via Seven Pairs. Claiming the chow forces melds.length>0,
    // permanently disqualifying Seven Pairs (sevenPairsShanten requires
    // zero melds), leaving only the standard shape at a worse shanten (2).
    const concealed = [
      ...idsFor('D1', 2),
      ...idsFor('D4', 2),
      ...idsFor('D7', 2),
      ...idsFor('B1', 2),
      ...idsFor('B4', 2),
      ...idsFor('C3', 1),
      ...idsFor('C4', 1),
      ...idsFor('WN', 1),
    ]
    const [c5] = idsFor('C5', 1)
    const hands: [Hand, Hand, Hand, Hand] = [handWith([c5!]), handWith(concealed), handWith([]), handWith([])]
    let state = baseState(hands, 0)
    state = applyMove(state, 0, { kind: 'discard', tile: c5! })
    expect(legalMoves(state, 1).some((m) => m.kind === 'chow')).toBe(true)

    for (const config of Object.values(BOT_PRESETS)) {
      expect(chooseClaimMove(state, 1, config)).toEqual({ kind: 'pass' })
    }
  })

  it('prefers pung over an equally-good chow when both are on offer and tied on resulting shanten', () => {
    // pung(DW×3) + pung(DG×3) [S=2] + C4,C5,C5,C6 [either pung(C5,C5) +
    // gapped-taatsu(C4,C6), or chow(C4,C5,C6) + leftover C5 — both worth
    // the same] + pair(C9,C9) + filler. The discarded 3rd C5 offers both a
    // pung and a chow claim, each independently reaching shanten 0.
    const concealed = [
      ...idsFor('DW', 3),
      ...idsFor('DG', 3),
      ...idsFor('C4', 1),
      ...idsFor('C5', 2),
      ...idsFor('C6', 1),
      ...idsFor('C9', 2),
      ...idsFor('WN', 1),
    ]
    const [c5third] = idsFor('C5', 3).slice(2)
    const hands: [Hand, Hand, Hand, Hand] = [handWith([c5third!]), handWith(concealed), handWith([]), handWith([])]
    let state = baseState(hands, 0)
    state = applyMove(state, 0, { kind: 'discard', tile: c5third! })
    expect(legalMoves(state, 1).map((m) => m.kind).sort()).toEqual(['chow', 'pass', 'pung'])

    for (const config of Object.values(BOT_PRESETS)) {
      expect(chooseClaimMove(state, 1, config)).toEqual({ kind: 'pung' })
    }
  })
})

describe('chooseMove — full headless simulation', () => {
  function pendingSeatsNeedingDecision(state: GameState): Seat[] {
    switch (state.phase) {
      case 'awaitingDraw':
      case 'awaitingDiscard':
        return [state.currentSeat]
      case 'awaitingClaims':
      case 'awaitingRobKongClaims': {
        const pendingClaim = state.pendingClaim
        if (!pendingClaim) return []
        return pendingClaim.eligibleSeats.filter((seat) => pendingClaim.declarations[seat] === undefined)
      }
      case 'handEnded':
        return []
    }
  }

  const PRESET_BY_SEAT: Record<Seat, (typeof BOT_PRESETS)[keyof typeof BOT_PRESETS]> = {
    0: BOT_PRESETS.efficient,
    1: BOT_PRESETS.balanced,
    2: BOT_PRESETS.conservative,
    3: BOT_PRESETS.efficient,
  }

  it(
    'plays many seeded hands to completion with no crashes, no illegal moves, and no infinite loops',
    () => {
      // Real shanten/efficiency computation per decision is inherently
      // heavier than the placeholder bot's O(1) rule (see shanten.ts's
      // searchBlocks comment on the caching this required to even be
      // practical) — 20 full hands already exercises a wide range of hand
      // shapes/claim situations; a longer sweep belongs in a manual/CI-only
      // perf pass, not the default test suite.
      const SEED_COUNT = 20
      let handsReachedEnd = 0

      for (let seed = 0; seed < SEED_COUNT; seed++) {
        let state = startHand({ seed, handNumber: 1, prevailingWind: 'east', dealerSeat: 0 })
        let actions = 0
        const cap = 2000
        while (state.phase !== 'handEnded') {
          if (actions++ > cap) {
            throw new Error(`Exceeded ${cap} actions for seed ${seed} — possible infinite loop`)
          }
          const pendingSeats = pendingSeatsNeedingDecision(state)
          const seat = pendingSeats[0]!
          const move = chooseMove(state, seat, PRESET_BY_SEAT[seat])
          state = applyMove(state, seat, move) // throws on any illegal move
        }
        handsReachedEnd++
      }

      expect(handsReachedEnd).toBe(SEED_COUNT)
    },
    // M5's 8-point win-legality gate (moves.ts) adds a scoreHand call to
    // every already-structurally-winning hand check — measured ~30-33s for
    // this sweep (was ~24s before), close enough to the old 30s bound to be
    // flaky rather than actually correctness-affected. Bumped with margin
    // rather than shrinking SEED_COUNT (see the comment above it).
    //
    // decisions.md #39's route-aware discard tie-break adds a
    // computeRouteToPoints/computeWaits call per genuinely-tied discard
    // candidate, for EVERY seat's own discard decision now (not just the one
    // human seat a hint request would cover) — measured ~46-49s for this
    // sweep against the same 20 seeds, pushing past the 45s bound. Bumped
    // with real margin again, same "widen the budget, don't shrink the
    // sweep" call as above.
    90_000,
  )

  it(
    'is deterministic for a given seed (same seed, same outcome, twice)',
    () => {
      function playOnce(seed: number): GameState {
        let state = startHand({ seed, handNumber: 1, prevailingWind: 'east', dealerSeat: 0 })
        let actions = 0
        while (state.phase !== 'handEnded') {
          if (actions++ > 2000) throw new Error('possible infinite loop')
          const pendingSeats = pendingSeatsNeedingDecision(state)
          const seat = pendingSeats[0]!
          state = applyMove(state, seat, chooseMove(state, seat, PRESET_BY_SEAT[seat]))
        }
        return state
      }
      const a = playOnce(7)
      const b = playOnce(7)
      expect(a.result).toEqual(b.result)
      expect(a.actionLog).toEqual(b.actionLog)
    },
    15_000,
  )
})
