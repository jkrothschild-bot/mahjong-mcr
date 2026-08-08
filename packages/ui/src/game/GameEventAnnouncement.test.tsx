import { act, render, renderHook, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildWall,
  emptyHand,
  seatWindFor,
  type Action,
  type GameState,
  type Hand,
  type PlayerState,
  type Seat,
} from '@mahjong-mcr/engine'
import type { SoundEffectsPlayer } from '../audio/soundEffects.js'
import { GameEventAnnouncement } from './GameEventAnnouncement.js'
import { useGameEventPresentation } from './useGameEventPresentation.js'

function stateWithLog(actionLog: Action[], phase: GameState['phase'] = 'awaitingDiscard'): GameState {
  const hands: [Hand, Hand, Hand, Hand] = [emptyHand(), emptyHand(), emptyHand(), emptyHand()]
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
    currentSeat: 1,
    phase,
    actionLog,
  }
}

function claimAction(claimType: 'chow' | 'pung' | 'kong', seat: Seat = 1): Action {
  return {
    seq: 0,
    seat,
    type: 'claim',
    claimType,
    claimedTile: 5,
    fromSeat: 0,
    usedConcealedTiles: [1, 2],
    meldId: '1-0',
  }
}

function Harness({ state, soundEnabled = false, player }: { state: GameState; soundEnabled?: boolean; player: SoundEffectsPlayer }) {
  const presentation = useGameEventPresentation(state, soundEnabled, player)
  return <GameEventAnnouncement announcement={presentation.announcement} />
}

describe('game-event presentation', () => {
  const player: SoundEffectsPlayer = { unlock: vi.fn(), play: vi.fn(), speakCall: vi.fn() }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(player.play).mockClear()
    vi.mocked(player.speakCall).mockClear()
  })
  afterEach(() => vi.useRealTimers())

  it.each([
    ['chow', 'CHOW'],
    ['pung', 'PUNG'],
    ['kong', 'KONG'],
  ] as const)('announces a successful %s for human and bot actions', (claimType, title) => {
    const initial = stateWithLog([])
    const { rerender } = render(<Harness state={initial} player={player} />)
    const claimed = stateWithLog([claimAction(claimType)])

    rerender(<Harness state={claimed} player={player} />)

    expect(screen.getByTestId('game-event-announcement')).toHaveTextContent(title)
    expect(screen.getByTestId('game-event-announcement')).toHaveTextContent('South')
    // The action is already fully applied; presentation does not hold the
    // state in a claim window or wait for its own animation to finish.
    expect(claimed.phase).toBe('awaitingDiscard')
  })

  it('uses the same announcement for the human player', () => {
    const initial = stateWithLog([])
    const { rerender } = render(<Harness state={initial} player={player} />)
    rerender(<Harness state={stateWithLog([claimAction('pung', 0)])} player={player} />)

    expect(screen.getByTestId('game-event-announcement')).toHaveTextContent('You')
    expect(screen.getByTestId('game-event-announcement')).toHaveTextContent('PUNG')
  })

  it('gives a win the stronger MAHJONG presentation', () => {
    const initial = stateWithLog([])
    const { rerender } = render(<Harness state={initial} player={player} />)
    rerender(
      <Harness
        state={{
          ...stateWithLog([{ seq: 0, seat: 1, type: 'win', winTile: 5, winMethod: 'discard', discardSeat: 0 }], 'handEnded'),
          result: { outcome: 'win', winnerSeats: [1], winningTile: 5, winMethod: 'discard', loserSeat: 0 },
        }}
        player={player}
      />,
    )

    const announcement = screen.getByTestId('game-event-announcement')
    expect(announcement).toHaveTextContent('MAHJONG!')
    expect(announcement).toHaveAttribute('data-event-kind', 'mahjong')
  })

  it('dismisses independently of subsequent non-presentational actions', () => {
    const initial = stateWithLog([])
    const { result, rerender } = renderHook(
      ({ state }) => useGameEventPresentation(state, false, player),
      { initialProps: { state: initial } },
    )
    const claim = claimAction('pung')
    rerender({ state: stateWithLog([claim]) })
    expect(result.current.announcement?.title).toBe('PUNG')
    expect(result.current.recentMeldId).toBe('1-0')

    // A later draw used to clear the toast's cleanup timer accidentally.
    rerender({ state: stateWithLog([claim, { seq: 1, seat: 1, type: 'draw', tile: 6, source: 'front' }]) })
    act(() => vi.advanceTimersByTime(1100))
    expect(result.current.announcement).toBeNull()
    expect(result.current.recentMeldId).toBeNull()
  })

  it('plays the matching cue when enabled and never plays when sound is off', () => {
    const initial = stateWithLog([])
    const enabled = renderHook(
      ({ state }) => useGameEventPresentation(state, true, player),
      { initialProps: { state: initial } },
    )
    enabled.rerender({ state: stateWithLog([claimAction('chow')]) })
    expect(player.play).toHaveBeenCalledWith('chow')
    expect(player.speakCall).toHaveBeenCalledWith('chow')
    enabled.unmount()

    vi.mocked(player.play).mockClear()
    vi.mocked(player.speakCall).mockClear()
    const disabled = renderHook(
      ({ state }) => useGameEventPresentation(state, false, player),
      { initialProps: { state: initial } },
    )
    disabled.rerender({ state: stateWithLog([claimAction('chow')]) })
    expect(player.play).not.toHaveBeenCalled()
    expect(player.speakCall).not.toHaveBeenCalled()
  })

  it.each(['chow', 'pung', 'kong'] as const)('speaks “%s” when that claim succeeds', (claim) => {
    const initial = stateWithLog([])
    const hook = renderHook(
      ({ state }) => useGameEventPresentation(state, true, player),
      { initialProps: { state: initial } },
    )

    hook.rerender({ state: stateWithLog([claimAction(claim)]) })

    expect(player.speakCall).toHaveBeenCalledWith(claim)
  })

  it('speaks Mahjong when a win succeeds', () => {
    const initial = stateWithLog([])
    const hook = renderHook(
      ({ state }) => useGameEventPresentation(state, true, player),
      { initialProps: { state: initial } },
    )

    hook.rerender({ state: stateWithLog([{ seq: 0, seat: 1, type: 'win', winTile: 5, winMethod: 'discard', discardSeat: 0 }], 'handEnded') })

    expect(player.speakCall).toHaveBeenCalledWith('mahjong')
  })

  it('plays a discard clink for the human but not for bots', () => {
    const initial = stateWithLog([])
    const human = renderHook(
      ({ state }) => useGameEventPresentation(state, true, player),
      { initialProps: { state: initial } },
    )
    human.rerender({ state: stateWithLog([{ seq: 0, seat: 0, type: 'discard', tile: 5 }]) })
    expect(player.play).toHaveBeenCalledWith('discard')
    human.unmount()

    vi.mocked(player.play).mockClear()
    const bot = renderHook(
      ({ state }) => useGameEventPresentation(state, true, player),
      { initialProps: { state: initial } },
    )
    bot.rerender({ state: stateWithLog([{ seq: 0, seat: 1, type: 'discard', tile: 5 }]) })
    expect(player.play).not.toHaveBeenCalled()
  })
})
