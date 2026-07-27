import type { GameState, Seat } from '@mahjong-mcr/engine'
import { HUMAN_SEAT } from './humanSeat.js'

// Shared by CallOutToast and ScoreScreen — a seat is named by its current
// wind ("East", "South", ...) since that's what rotates hand-to-hand and
// matches how the board itself labels seats, except the human, always "You".
export function seatDisplayName(seat: Seat, state: GameState): string {
  if (seat === HUMAN_SEAT) return 'You'
  const wind = state.players[seat].seatWind
  return wind.charAt(0).toUpperCase() + wind.slice(1)
}
