import { describe, expect, it } from 'vitest'
import { drawableRemaining, startHand } from '@mahjong-mcr/engine'
import { buildInitialDealFrames } from './initialDealPresentation.js'

describe('initial deal presentation', () => {
  it('starts with the complete wall and empty hands', () => {
    const first = buildInitialDealFrames(42, 0)[0]!
    expect(drawableRemaining(first.wall)).toBe(144)
    expect(Object.values(first.concealedBySeat).flat()).toHaveLength(0)
    expect(first.phase).toBe('wall-built')
  })

  it('shows the first three passes as groups of four in dealer seat order', () => {
    const frames = buildInitialDealFrames(42, 1)
    const primary = frames.slice(1, 13)
    expect(primary.map((frame) => frame.activeSeat)).toEqual([1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3, 0])
    expect(primary.map((frame, index) => Object.values(frame.concealedBySeat).flat().length - Object.values(frames[index]!.concealedBySeat).flat().length)).toEqual(new Array(12).fill(4))
  })

  it('settles to the exact authoritative wall and hands produced by startHand', () => {
    for (let seed = 0; seed < 20; seed++) {
      const state = startHand({ seed, handNumber: 1, prevailingWind: 'east', dealerSeat: 0 })
      const last = buildInitialDealFrames(seed, 0).at(-1)!
      expect(last.wall).toEqual(state.wall)
      for (const player of state.players) {
        expect(last.concealedBySeat[player.seat]).toEqual(player.hand.concealedTiles)
        expect(last.flowersBySeat[player.seat]).toEqual(player.hand.flowers)
      }
    }
  })
})
