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
import { startHand, type GameState, type StartHandParams } from './game-state.js'
import { applyMove, type Move } from './moves.js'
import { replayToIndex, type RecordedMove } from './replay.js'
import { isWinningHand, ORDERED_STANDARD_TYPE_IDS } from './win-detection.js'
import { buildWall } from './wall.js'
import { mulberry32, nextSeed, shuffle } from './rng.js'
import { scoreHand } from './scoring/score-hand.js'
import { TILE_TYPE_BY_ID, typeIdOfInstance, type TileInstanceId, type TileTypeId } from './tiles.js'
import type { Meld, Seat } from './meld.js'

const SEED_COUNT = 100

function assertTileConservation(state: GameState) {
  const seen: number[] = []
  seen.push(...state.wall.tiles.slice(state.wall.frontIndex, state.wall.backIndex + 1))
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
      const startParams: StartHandParams = { seed, handNumber: 1, prevailingWind: 'east', dealerSeat: 0 }
      const history: RecordedMove[] = []
      const final = playRandomHand({
        ...startParams,
        agentRng,
        onMove: (seat, move) => history.push({ seat, move }),
      })

      // M6's replay.ts extracts this exact loop (startHand once, then
      // applyMove in order) as replayToIndex — reused here rather than
      // hand-rolled, now that it exists.
      expect(replayToIndex(startParams, history, history.length)).toEqual(final)
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

// A hand's score is a function of tile TYPES plus win context. Which of the
// four physical copies of a type happens to be sitting in the hand is an
// implementation detail of the wall, and must never move a single point.
//
// This invariant is not decorative — it is the one that catches the whole
// class of bug where scoring code accidentally treats a TileInstanceId as a
// value rather than an index. Instance ids are 0-based, so `!id`, `id ||
// fallback`, `id ? a : b` and friends all silently mis-handle instance 0 (the
// first physical copy of C1). Unit fixtures cannot reach this class: they pick
// their own instances via helpers that hand out low indices for whichever type
// is named first, so instance 0 lands on the winning tile only by coincidence.
//
// It found a real bug on its first run — see docs/rules/decisions.md #36
// (classifyWait's `!ctx.winningTile` guard suppressing fans 77/78/79 for
// instance 0, which could drop a legal 8-point hand to 7 and get the win
// refused by moves.ts's canDeclareWin).
const INSTANCES_BY_TYPE = new Map<TileTypeId, TileInstanceId[]>()
for (let instance = 0; instance < TILE_TYPE_BY_ID.length; instance++) {
  const typeId = typeIdOfInstance(instance)
  const pool = INSTANCES_BY_TYPE.get(typeId)
  if (pool) pool.push(instance)
  else INSTANCES_BY_TYPE.set(typeId, [instance])
}

// Hands out physical copies of a type, never a 5th — mirrors the wall's own
// 4-copies-per-type budget so generated hands stay physically realizable.
function makeAllocator() {
  const used = new Map<TileTypeId, number>()
  return {
    remaining: (typeId: TileTypeId) => (INSTANCES_BY_TYPE.get(typeId)?.length ?? 0) - (used.get(typeId) ?? 0),
    take(typeId: TileTypeId, count: number): TileInstanceId[] {
      const pool = INSTANCES_BY_TYPE.get(typeId)!
      const alreadyUsed = used.get(typeId) ?? 0
      const picked = pool.slice(alreadyUsed, alreadyUsed + count)
      if (picked.length < count) throw new Error(`allocator: only ${picked.length} of ${typeId} left`)
      used.set(typeId, alreadyUsed + count)
      return picked
    },
  }
}

const SUITED_CHOW_STARTS: { suit: string; rank: number }[] = []
for (const suit of ['C', 'D', 'B']) {
  for (let rank = 1; rank <= 7; rank++) SUITED_CHOW_STARTS.push({ suit, rank })
}

// A random four-sets-plus-pair hand, some sets declared as exposed melds.
// Returns null when the tile budget can't satisfy a shape (rare; caller skips).
function buildRandomWinningHand(seed: number) {
  const rng = mulberry32(seed)
  const alloc = makeAllocator()
  const melds: Meld[] = []
  const concealed: TileInstanceId[] = []
  const meldCount = Math.floor(rng.next() * 5) // 0..4

  const takeChow = (): TileInstanceId[] | null => {
    for (const { suit, rank } of shuffle(SUITED_CHOW_STARTS, rng)) {
      const ids = [`${suit}${rank}`, `${suit}${rank + 1}`, `${suit}${rank + 2}`] as TileTypeId[]
      if (ids.every((id) => alloc.remaining(id) >= 1)) return ids.map((id) => alloc.take(id, 1)[0]!)
    }
    return null
  }
  const takePungLike = (copies: 3 | 4): TileInstanceId[] | null => {
    for (const typeId of shuffle(ORDERED_STANDARD_TYPE_IDS, rng)) {
      if (alloc.remaining(typeId) >= copies) return alloc.take(typeId, copies)
    }
    return null
  }

  for (let i = 0; i < 4; i++) {
    const roll = rng.next()
    const declareAsMeld = i < meldCount
    if (roll < 0.4) {
      const tiles = takeChow()
      if (!tiles) return null
      if (declareAsMeld) {
        melds.push({ id: `m${i}`, kind: 'chow', exposure: 'exposed', tiles, ownerSeat: 0, claimedFrom: { seat: 3, discardTile: tiles[0]! } })
      } else concealed.push(...tiles)
    } else if (roll < 0.8) {
      const tiles = takePungLike(3)
      if (!tiles) return null
      // meld.ts only models a concealed KONG; a concealed pung is plain tiles.
      if (declareAsMeld) {
        melds.push({ id: `m${i}`, kind: 'pung', exposure: 'exposed', tiles, ownerSeat: 0, claimedFrom: { seat: 3, discardTile: tiles[0]! } })
      } else concealed.push(...tiles)
    } else {
      const tiles = takePungLike(4)
      if (!tiles) return null
      const isConcealed = rng.next() < 0.5
      melds.push({
        id: `m${i}`,
        kind: 'kong',
        exposure: isConcealed ? 'concealed' : 'exposed',
        kongSource: isConcealed ? 'concealed' : 'exposedFromDiscard',
        tiles,
        ownerSeat: 0,
        ...(isConcealed ? {} : { claimedFrom: { seat: 3 as Seat, discardTile: tiles[0]! } }),
      })
    }
  }

  let pair: TileInstanceId[] | null = null
  for (const typeId of shuffle(ORDERED_STANDARD_TYPE_IDS, rng)) {
    if (alloc.remaining(typeId) >= 2) { pair = alloc.take(typeId, 2); break }
  }
  if (!pair) return null
  concealed.push(...pair)

  const concealedTiles = shuffle(concealed, rng)
  if (!isWinningHand(concealedTiles, melds)) return null
  const winningTile = concealedTiles[Math.floor(rng.next() * concealedTiles.length)]!
  return { concealedTiles, melds, winningTile }
}

// Rewrites every tile to a DIFFERENT physical copy of the same type, keeping
// the hand's type composition byte-identical.
function remapToOtherCopies(
  concealedTiles: readonly TileInstanceId[],
  melds: readonly Meld[],
  rotate: number,
) {
  const takenPerType = new Map<TileTypeId, number>()
  const mapping = new Map<TileInstanceId, TileInstanceId>()
  const assign = (instance: TileInstanceId) => {
    if (mapping.has(instance)) return
    const typeId = typeIdOfInstance(instance)
    const pool = INSTANCES_BY_TYPE.get(typeId)!
    const n = takenPerType.get(typeId) ?? 0
    takenPerType.set(typeId, n + 1)
    mapping.set(instance, pool[(n + rotate) % pool.length]!)
  }
  for (const meld of melds) for (const tile of meld.tiles) assign(tile)
  for (const tile of concealedTiles) assign(tile)

  return {
    concealedTiles: concealedTiles.map((t) => mapping.get(t)!),
    melds: melds.map((m) => ({ ...m, tiles: m.tiles.map((t) => mapping.get(t)!) })),
    mapping,
  }
}

describe('property: scoring is invariant under physical tile identity', () => {
  it('the same hand scores the same whichever physical copies it is built from', () => {
    let handsChecked = 0
    let comparisons = 0
    let sawInstanceZeroAsWinningTile = false

    const master = mulberry32(20260809)
    for (let i = 0; i < 800; i++) {
      const hand = buildRandomWinningHand(nextSeed(master))
      if (!hand) continue
      handsChecked++

      for (const winMethod of ['selfDraw', 'discard'] as const) {
        const baseline = scoreHand({ ...hand, winMethod })
        for (let rotate = 1; rotate <= 3; rotate++) {
          const remapped = remapToOtherCopies(hand.concealedTiles, hand.melds, rotate)
          const winningTile = remapped.mapping.get(hand.winningTile)!
          if (winningTile === 0) sawInstanceZeroAsWinningTile = true
          const rescored = scoreHand({
            concealedTiles: remapped.concealedTiles,
            melds: remapped.melds,
            winningTile,
            winMethod,
          })
          comparisons++
          // Compare the full fan multiset, not just the total: a swap between
          // two equal-point fans is still a scoring difference the player sees.
          expect({ seedIndex: i, rotate, winMethod, ...rescored }).toEqual({ seedIndex: i, rotate, winMethod, ...baseline })
        }
      }
    }

    expect(handsChecked).toBeGreaterThan(500) // the generator actually produced hands
    expect(comparisons).toBeGreaterThan(3_000)
    // Guard the guard: if remapping never puts instance 0 on the winning tile,
    // this test cannot see the bug class it exists for.
    expect(sawInstanceZeroAsWinningTile).toBe(true)
  }, 30_000)
})

describe('property: action log is consistent with the deterministic wall generator', () => {
  it('every logged draw/flowerReplacement tile matches buildWall(seed) at the expected front/back index', () => {
    for (let seed = 0; seed < SEED_COUNT; seed++) {
      const agentRng = mulberry32(seed * 5 + 2)
      const initial = startHand({ seed, handNumber: 1, prevailingWind: 'east', dealerSeat: 0 })
      const final = playRandomHand({ seed, handNumber: 1, prevailingWind: 'east', dealerSeat: 0, agentRng })

      const wall = buildWall(seed)
      // The deal itself already consumed [0, frontIndex) from the front and
      // (backIndex, 143] from the back (any flowers dealt) — resume from
      // there. A 'draw' action's own `source` says which end it came from;
      // every 'flowerReplacement' is unconditionally back (§3.4.20,
      // KICKOFF-phase8-addendum-decisions.md).
      let frontIndex = initial.wall.frontIndex
      let backIndex = initial.wall.backIndex
      const drawActions = final.actionLog.filter((a) => a.type === 'draw' || a.type === 'flowerReplacement')
      for (const action of drawActions) {
        if (action.type === 'draw') {
          const expectedTile = wall.tiles[action.source === 'front' ? frontIndex : backIndex]
          expect(action.tile).toBe(expectedTile)
          if (action.source === 'front') frontIndex++
          else backIndex--
        } else {
          expect(action.replacementTile).toBe(wall.tiles[backIndex])
          backIndex--
        }
      }
    }
  })
})
