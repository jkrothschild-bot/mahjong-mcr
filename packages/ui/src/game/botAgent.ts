import { BOT_PRESETS, chooseMove, type GameState, type Move, type Seat } from '@mahjong-mcr/engine'

// A thin adapter over the real M4 bot policy (packages/engine/src/bots/
// policy.ts) — replaces the M3 placeholder ("win > discard > first legal
// non-pass move > pass"). Each non-human seat gets a fixed preset,
// deterministic across the match. HUMAN_SEAT's own entry is never
// consulted for a real decision — useGameLoop's auto-draw effect calls
// this for the human seat too, but only during 'awaitingDraw', where
// chooseMove's only legal move is {kind:'draw'} regardless of config.
const PRESET_BY_SEAT: Record<Seat, keyof typeof BOT_PRESETS> = {
  0: 'balanced',
  1: 'efficient',
  2: 'balanced',
  3: 'conservative',
}

export function chooseBotMove(state: GameState, seat: Seat): Move {
  return chooseMove(state, seat, BOT_PRESETS[PRESET_BY_SEAT[seat]])
}
