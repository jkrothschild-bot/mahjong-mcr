import { rankDiscards } from './bots/policy.js'
import type { Hand } from './hand.js'
import { evaluateDiscards, type DiscardEvaluation } from './tile-efficiency.js'
import type { TileInstanceId } from './tiles.js'

// SPEC.md §6's "Best move" hint tab ≈ Nudge + Options: the recommended
// discard with a one-line reason is the shallow read; `alternatives` (the
// rest of the same ranked list) is the deeper "other reasonable choices"
// detail, both available the instant the tab opens. Reuses bots/policy.ts's
// own rankDiscards so the hint can never disagree with what a bot would
// actually do with the same hand (SPEC.md §6: "Hint engine and bot AI share
// the same evaluation core").
export interface BestMoveHint {
  recommendedDiscard: TileInstanceId
  reason: string
  alternatives: DiscardEvaluation[]
}

function buildReason(top: DiscardEvaluation): string {
  const { resultingShanten, ukeire } = top
  const tileWord = (n: number) => `${n} tile${n === 1 ? '' : 's'}`
  if (resultingShanten < 0) return 'Your hand is already complete — this discard is just a formality.'
  if (resultingShanten === 0) return `Keeps you tenpai (ready to win), waiting on ${tileWord(ukeire.totalCount)}.`
  return `Keeps you at ${resultingShanten}-shanten with the most outs — ${tileWord(ukeire.totalCount)} would improve your hand.`
}

// Null only when there's genuinely no discard decision to make (an empty
// hand — shouldn't occur mid-game, but keeps this total rather than
// throwing on a malformed caller).
export function computeBestMoveHint(hand: Hand): BestMoveHint | null {
  const evaluations = evaluateDiscards(hand)
  if (evaluations.length === 0) return null

  const [top, ...alternatives] = rankDiscards(evaluations)
  return { recommendedDiscard: top!.tile, reason: buildReason(top!), alternatives }
}
