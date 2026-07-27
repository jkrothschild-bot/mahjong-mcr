import type { GameState, Seat } from '@mahjong-mcr/engine'

// UI-owned reimplementation of the identical (private, test-only) helper in
// packages/engine/src/testing/random-agent.ts. That module is deliberately
// not part of @mahjong-mcr/engine's public surface (it's a headless test
// harness), so this small piece of logic — "whose decision does the state
// machine need next" — has to live here instead of being imported.
export function pendingSeatsNeedingDecision(state: GameState): Seat[] {
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
