import { Positioned } from '../stage/Positioned.js'
import { useStageMetrics } from '../stage/StageMetricsContext.js'
import { getBoardRegions } from '../stage/stageLayout.js'

// Phase 7 (KICKOFF-phase7-board-rebuild.md): a thin decorative ring around
// the discard field's own four sides — replaces the old single WallSegment
// strip (a "next 7 tiles" indicator, still shown separately by WallCounter/
// WallSegment... actually retired in this rebuild, see Board.tsx) with a
// purely spatial frame matching the field it now wraps. No per-tile
// identity here (unlike the old WallSegment, which used real wall
// TileInstanceIds for animation continuity) — this is table furniture, not
// game state; WallCounter's own text is still the authoritative "N left."
//
// Reads designWidth via useStageMetrics() itself, rather than taking
// `regions` as a prop computed by a parent — this component is rendered
// INSIDE <GameStage>'s children, so it sits inside the StageMetricsContext
// Provider boundary; a parent computing getBoardRegions(designWidth)
// itself (Board.tsx, which RENDERS GameStage and is therefore *outside*
// that boundary) would silently read the context's default value
// (MIN_DESIGN_WIDTH) instead of the live one — the exact bug this
// component's own first version had, caught from a live screenshot: the
// field/wall rendered at ~39% of board width (matching designWidth=1024)
// at every viewport, while Seat.tsx's regions (correctly read from inside
// the boundary) resized normally.
const SEGMENT_CLASS =
  'bg-[repeating-linear-gradient(90deg,#d8b378_0_10px,#a8763f_10px_20px)] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.35)] rounded-[2px]'
const SEGMENT_CLASS_VERTICAL =
  'bg-[repeating-linear-gradient(0deg,#d8b378_0_10px,#a8763f_10px_20px)] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.35)] rounded-[2px]'

export function WallRing() {
  const { designWidth } = useStageMetrics()
  const regions = getBoardRegions(designWidth).wall
  return (
    <div aria-hidden="true" data-testid="wall-ring">
      <Positioned
        x={regions.top.x + regions.top.width / 2}
        y={regions.top.y + regions.top.height / 2}
        naturalWidth={regions.top.width}
        naturalHeight={regions.top.height}
      >
        <div className={`h-full w-full ${SEGMENT_CLASS}`} />
      </Positioned>
      <Positioned
        x={regions.bottom.x + regions.bottom.width / 2}
        y={regions.bottom.y + regions.bottom.height / 2}
        naturalWidth={regions.bottom.width}
        naturalHeight={regions.bottom.height}
      >
        <div className={`h-full w-full ${SEGMENT_CLASS}`} />
      </Positioned>
      <Positioned
        x={regions.left.x + regions.left.width / 2}
        y={regions.left.y + regions.left.height / 2}
        naturalWidth={regions.left.width}
        naturalHeight={regions.left.height}
      >
        <div className={`h-full w-full ${SEGMENT_CLASS_VERTICAL}`} />
      </Positioned>
      <Positioned
        x={regions.right.x + regions.right.width / 2}
        y={regions.right.y + regions.right.height / 2}
        naturalWidth={regions.right.width}
        naturalHeight={regions.right.height}
      >
        <div className={`h-full w-full ${SEGMENT_CLASS_VERTICAL}`} />
      </Positioned>
    </div>
  )
}
