import type { MatchState, Wind } from '@mahjong-mcr/engine'

export interface WindIndicatorProps {
  matchState: MatchState
}

function capitalize(wind: Wind): string {
  return wind.charAt(0).toUpperCase() + wind.slice(1)
}

// "East 2 of 16" per SPEC.md §5: prevailing wind + which hand within that
// wind round (roundHandIndex), plus the absolute hand count out of the
// fixed 16-hand match (matchHandNumber) — both come from match.ts's real
// dealer/round rotation now, not a hardcoded string.
export function WindIndicator({ matchState }: WindIndicatorProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2">
      <span data-testid="wind-indicator" className="text-lg font-semibold">
        {capitalize(matchState.prevailingWind)} {matchState.roundHandIndex}
      </span>
      <span className="text-xs text-neutral-400">Hand {matchState.matchHandNumber} of 16</span>
    </div>
  )
}
