import type { MatchState, Wind } from '@mahjong-mcr/engine'

export interface WindIndicatorProps {
  matchState: MatchState
}

function capitalize(wind: Wind): string {
  return wind.charAt(0).toUpperCase() + wind.slice(1)
}

// "East 2 · Hand 5 of 16" per SPEC.md §5: prevailing wind + which hand
// within that wind round (roundHandIndex), plus the absolute hand count out
// of the fixed 16-hand match (matchHandNumber) — both come from match.ts's
// real dealer/round rotation now, not a hardcoded string. Single-line (not
// stacked) to keep this chrome row compact — found via live play that the
// two-line version was part of what pushed the board past the iPad
// viewport's height budget (SPEC.md §5a's hard no-scroll rule).
export function WindIndicator({ matchState }: WindIndicatorProps) {
  return (
    <div data-testid="wind-indicator" className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm">
      <span className="font-semibold">
        {capitalize(matchState.prevailingWind)} {matchState.roundHandIndex}
      </span>
      <span className="text-neutral-400">· Hand {matchState.matchHandNumber} of 16</span>
    </div>
  )
}
