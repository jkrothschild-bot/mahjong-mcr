import type { PendingClaim } from './game-state.js'
import type { Seat } from './meld.js'
import type { Move } from './moves.js'

export function allDeclared(pendingClaim: PendingClaim): boolean {
  return pendingClaim.eligibleSeats.every((seat) => pendingClaim.declarations[seat] !== undefined)
}

export interface ResolvedClaim {
  seat: Seat
  move: Move
}

function nearestInTurnOrder(fromSeat: Seat, candidates: readonly Seat[]): Seat {
  let best = candidates[0]!
  let bestOffset = (best - fromSeat + 4) % 4
  for (const seat of candidates.slice(1)) {
    const offset = (seat - fromSeat + 4) % 4
    if (offset < bestOffset) {
      best = seat
      bestOffset = offset
    }
  }
  return best
}

// Priority: win > pung/kong > chow. Structurally, at most one seat can ever
// have a pung/kong claim available on a given discard (only 4 physical
// copies of any tile type exist; once one is discarded, at most 3 remain —
// insufficient for two different players to each hold 2+), and chow is
// restricted to exactly the discarder's next seat by rule — so there is
// never a same-type priority contest to resolve, only win vs. pung/kong vs.
// chow across categories.
//
// Multi-simultaneous win is disallowed in M1 (docs/rules/decisions.md #2):
// if more than one seat declared win, the seat nearest in turn order after
// `fromSeat` wins; this is flagged there for rulebook confirmation before M2
// settlement locks in, since it affects payment math.
export function resolvePendingClaim(pendingClaim: PendingClaim): ResolvedClaim | null {
  const declaredSeats = pendingClaim.eligibleSeats.filter((seat) => {
    const move = pendingClaim.declarations[seat]
    return move !== undefined && move.kind !== 'pass'
  })

  const winSeats = declaredSeats.filter((seat) => pendingClaim.declarations[seat]!.kind === 'win')
  if (winSeats.length > 0) {
    const seat = nearestInTurnOrder(pendingClaim.fromSeat, winSeats)
    return { seat, move: pendingClaim.declarations[seat]! }
  }

  const pungKongSeats = declaredSeats.filter((seat) => {
    const kind = pendingClaim.declarations[seat]!.kind
    return kind === 'pung' || kind === 'kong'
  })
  if (pungKongSeats.length > 0) {
    const seat = pungKongSeats[0]!
    return { seat, move: pendingClaim.declarations[seat]! }
  }

  const chowSeats = declaredSeats.filter((seat) => pendingClaim.declarations[seat]!.kind === 'chow')
  if (chowSeats.length > 0) {
    const seat = chowSeats[0]!
    return { seat, move: pendingClaim.declarations[seat]! }
  }

  return null
}
