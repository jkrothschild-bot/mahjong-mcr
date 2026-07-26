import type { Seat } from '../meld.js'
import type { SettlementResult } from './types.js'

export interface ComputeSettlementParams {
  winnerSeat: Seat
  basicPoints: number // sum of qualifying fans' points — the 8-point minimum check (§3.9.1.1) is the caller's responsibility, using this value alone
  flowerPoints: number // excluded from the 8-point qualification check, but paid exactly like basic points (Fan #81, p.41: "will award you one point when you succeed in Hu")
  winMethod: 'selfDraw' | 'discard' | 'robKong'
  discarderSeat?: Seat // required for 'discard' and 'robKong' (robbing the kong is settled the same way, with the promoting player standing in for the discarder)
}

const ALL_SEATS: readonly Seat[] = [0, 1, 2, 3]

// §3.9.1.2-3 (docs/rules/decisions.md #10), exact confirmed formulas:
// "Extra Points" = flat 8, paid by every non-winner regardless of method.
// Self-drawn: each of the 3 other players pays Extra + Basic (here, Basic
// includes flower points folded in, per the note above).
// Discard (and Robbing the Kong, settled the same way): the discarder pays
// Extra + Basic; the other two players pay Extra (8) only.
export function computeSettlement(params: ComputeSettlementParams): SettlementResult {
  const { winnerSeat, basicPoints, flowerPoints, winMethod, discarderSeat } = params
  const totalPoints = basicPoints + flowerPoints
  const payments: Record<Seat, number> = { 0: 0, 1: 0, 2: 0, 3: 0 }
  const otherSeats = ALL_SEATS.filter((seat) => seat !== winnerSeat)

  if (winMethod === 'selfDraw') {
    for (const seat of otherSeats) {
      const amount = 8 + totalPoints
      payments[seat] -= amount
      payments[winnerSeat] += amount
    }
  } else {
    if (discarderSeat === undefined) {
      throw new Error(`discarderSeat is required for winMethod '${winMethod}'`)
    }
    if (discarderSeat === winnerSeat) {
      throw new Error('discarderSeat cannot be the winner')
    }
    for (const seat of otherSeats) {
      const amount = seat === discarderSeat ? 8 + totalPoints : 8
      payments[seat] -= amount
      payments[winnerSeat] += amount
    }
  }

  return { winnerSeat, basicPoints, flowerPoints, payments }
}
