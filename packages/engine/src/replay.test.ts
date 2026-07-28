import { describe, expect, it } from 'vitest'
import { startHand, type GameState, type StartHandParams } from './game-state.js'
import { mulberry32 } from './rng.js'
import { replayToIndex, type RecordedMove } from './replay.js'
import { playRandomHand } from './testing/random-agent.js'

const SEED_COUNT = 20

describe('replayToIndex', () => {
  it('uptoIndex 0 reproduces the freshly-dealt state, for many seeded hands', () => {
    for (let seed = 0; seed < SEED_COUNT; seed++) {
      const startParams: StartHandParams = { seed, handNumber: 1, prevailingWind: 'east', dealerSeat: 0 }
      expect(replayToIndex(startParams, [], 0)).toEqual(startHand(startParams))
    }
  })

  it('replaying the full recorded (seat, move) history reproduces the exact live end state', () => {
    for (let seed = 0; seed < SEED_COUNT; seed++) {
      const startParams: StartHandParams = { seed, handNumber: 1, prevailingWind: 'east', dealerSeat: 0 }
      const agentRng = mulberry32(seed * 31 + 7)
      const moveLog: RecordedMove[] = []
      const live = playRandomHand({
        ...startParams,
        agentRng,
        onMove: (seat, move) => moveLog.push({ seat, move }),
      })

      expect(replayToIndex(startParams, moveLog, moveLog.length)).toEqual(live)
    }
  })

  it('an intermediate index reproduces the exact live state at that same step', () => {
    const startParams: StartHandParams = { seed: 42, handNumber: 1, prevailingWind: 'east', dealerSeat: 0 }
    const agentRng = mulberry32(999)
    const moveLog: RecordedMove[] = []
    const liveStatesByIndex: GameState[] = []
    playRandomHand({
      ...startParams,
      agentRng,
      onMove: (seat, move, state) => {
        moveLog.push({ seat, move })
        liveStatesByIndex.push(state)
      },
    })

    expect(moveLog.length).toBeGreaterThan(10)
    const midpoint = Math.floor(moveLog.length / 2)
    expect(replayToIndex(startParams, moveLog, midpoint)).toEqual(liveStatesByIndex[midpoint - 1])
  })

  it('clamps out-of-range indices instead of throwing', () => {
    const startParams: StartHandParams = { seed: 1, handNumber: 1, prevailingWind: 'east', dealerSeat: 0 }
    const agentRng = mulberry32(5)
    const moveLog: RecordedMove[] = []
    const live = playRandomHand({ ...startParams, agentRng, onMove: (seat, move) => moveLog.push({ seat, move }) })

    expect(replayToIndex(startParams, moveLog, moveLog.length + 1000)).toEqual(live)
    expect(replayToIndex(startParams, moveLog, -5)).toEqual(startHand(startParams))
  })
})
