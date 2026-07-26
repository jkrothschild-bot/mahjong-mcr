// Property tests for the M1 engine (PLAN.md §4.3 invariants), scoped to what
// is testable without scoring/shanten:
//   1. Tile conservation
//   2. Winning hands are valid structural decompositions
//   3. The game always terminates (random-legal-move simulation)
//   4. Replay determinism (same seed + same move sequence -> same state)
//   5. The action log is consistent with the deterministic wall generator
//
// Explicitly NOT tested here (needs M2/M4): total score >= 8, exclusion
// rules never double-counting, and "displayed waits match a structurally
// valid completion."
import { describe, expect, it } from 'vitest'
import { playRandomHand } from './testing/random-agent.js'
import { startHand, type GameState } from './game-state.js'
import { applyMove, type Move } from './moves.js'
import { isWinningHand } from './win-detection.js'
import { buildWall } from './wall.js'
import { mulberry32 } from './rng.js'
import type { Seat } from './meld.js'

const SEED_COUNT = 100

function assertTileConservation(state: GameState) {
  const seen: number[] = []
  seen.push(...state.wall.tiles.slice(state.wall.drawIndex))
  for (const player of state.players) {
    seen.push(...player.hand.concealedTiles, ...player.hand.flowers, ...player.discards)
    for (const meld of player.hand.melds) seen.push(...meld.tiles)
  }
  seen.sort((a, b) => a - b)
  expect(seen).toEqual(Array.from({ length: 144 }, (_, i) => i))
}

describe('property: tile conservation', () => {
  it('holds after every move, across many seeded hands', () => {
    for (let seed = 0; seed < SEED_COUNT; seed++) {
      const agentRng = mulberry32(seed * 7919 + 1)
      const initial = startHand({ seed, handNumber: 1, prevailingWind: 'east', dealerSeat: 0 })
      assertTileConservation(initial)
      playRandomHand({
        seed,
        handNumber: 1,
        prevailingWind: 'east',
        dealerSeat: 0,
        agentRng,
        onMove: (_seat, _move, state) => assertTileConservation(state),
      })
    }
  })
})

describe('property: winning hands are valid decompositions', () => {
  it('every win action\'s resulting hand independently passes isWinningHand', () => {
    // Winning hands are 14 + (#kongs) physical tiles, not literally always
    // 14 — a hand with one exposed kong completes at 15 physical tiles
    // (11 concealed + 4 in the kong), etc.
    let winsObserved = 0
    for (let seed = 0; seed < SEED_COUNT; seed++) {
      const agentRng = mulberry32(seed * 104729 + 7)
      const final = playRandomHand({ seed, handNumber: 1, prevailingWind: 'east', dealerSeat: 0, agentRng })
      if (final.result?.outcome !== 'win') continue
      winsObserved++
      const winnerSeat = final.result.winnerSeats![0]!
      const winnerHand = final.players[winnerSeat].hand
      const concealedForCheck =
        final.result.winMethod === 'selfDraw'
          ? winnerHand.concealedTiles
          : [...winnerHand.concealedTiles, final.result.winningTile!]
      expect(isWinningHand(concealedForCheck, winnerHand.melds)).toBe(true)
    }
    expect(winsObserved).toBeGreaterThan(0) // sanity: the harness actually produced some wins
  })
})

describe('property: termination', () => {
  // Scope note: an earlier version of this test simulated full 16-round
  // matches and asserted matchState.completed. Running it turned up a real
  // finding (not a bug): with purely-uniform-random discards (no
  // tile-keeping strategy at all), a hand almost never organically
  // assembles a winning shape — every sampled hand ended in exhaustive
  // draw, which always repeats the dealer (see docs/rules/decisions.md
  // #4), so the match essentially never rotates past hand 1. That's a
  // property of "random discards," not of the engine. The actual
  // "no-infinite-loop" guarantee the invariant cares about is bounded by
  // wall exhaustion at the HAND level, which every property test in this
  // file already exercises across many seeds without hitting the action
  // cap; dealer/wind rotation itself is deterministic bookkeeping already
  // covered directly by match.test.ts. So: assert hand-level termination
  // here (many seeds, generous but finite cap), and leave full-match
  // rotation to match.test.ts rather than a random-play simulation.
  it('every hand reaches handEnded well within a generous action cap, across many seeds', () => {
    for (let seed = 0; seed < 300; seed++) {
      const agentRng = mulberry32(seed * 48271 + 11)
      const final = playRandomHand({ seed, handNumber: 1, prevailingWind: 'east', dealerSeat: 0, agentRng, maxActions: 2_000 })
      expect(final.phase).toBe('handEnded')
      expect(final.result).toBeDefined()
    }
  })
})

describe('property: replay determinism', () => {
  it('replaying the exact same (seat, move) sequence from the same seed reproduces the final state', () => {
    for (let seed = 0; seed < 20; seed++) {
      const agentRng = mulberry32(seed * 13 + 3)
      const history: { seat: Seat; move: Move }[] = []
      const final = playRandomHand({
        seed,
        handNumber: 1,
        prevailingWind: 'east',
        dealerSeat: 0,
        agentRng,
        onMove: (seat, move) => history.push({ seat, move }),
      })

      let replay = startHand({ seed, handNumber: 1, prevailingWind: 'east', dealerSeat: 0 })
      for (const { seat, move } of history) {
        replay = applyMove(replay, seat, move)
      }
      expect(replay).toEqual(final)
    }
  })

  it('intermediate states also match at every step, not just the final one', () => {
    const seed = 42
    const agentRng = mulberry32(999)
    const original: GameState[] = []
    playRandomHand({
      seed,
      handNumber: 1,
      prevailingWind: 'east',
      dealerSeat: 0,
      agentRng,
      onMove: (_seat, _move, state) => original.push(state),
    })

    let replay = startHand({ seed, handNumber: 1, prevailingWind: 'east', dealerSeat: 0 })
    const replayAgentRng = mulberry32(999)
    let index = 0
    playRandomHand({
      seed,
      handNumber: 1,
      prevailingWind: 'east',
      dealerSeat: 0,
      agentRng: replayAgentRng,
      onMove: (seat, move) => {
        replay = applyMove(replay, seat, move)
        expect(replay).toEqual(original[index])
        index++
      },
    })
    expect(index).toBe(original.length)
  })
})

describe('property: action log is consistent with the deterministic wall generator', () => {
  it('every logged draw/flowerReplacement tile matches buildWall(seed) at the expected index', () => {
    for (let seed = 0; seed < SEED_COUNT; seed++) {
      const agentRng = mulberry32(seed * 5 + 2)
      const initial = startHand({ seed, handNumber: 1, prevailingWind: 'east', dealerSeat: 0 })
      const final = playRandomHand({ seed, handNumber: 1, prevailingWind: 'east', dealerSeat: 0, agentRng })

      const wall = buildWall(seed)
      let index = initial.wall.drawIndex // deal already consumed [0, index)
      const drawActions = final.actionLog.filter((a) => a.type === 'draw' || a.type === 'flowerReplacement')
      for (const action of drawActions) {
        const expectedTile = wall.tiles[index]
        const actualTile = action.type === 'draw' ? action.tile : action.replacementTile
        expect(actualTile).toBe(expectedTile)
        index++
      }
    }
  })
})
