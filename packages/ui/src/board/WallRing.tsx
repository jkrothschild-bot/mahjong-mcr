import type { CSSProperties } from 'react'
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
const TILE_COURSE_BASE: CSSProperties = {
  backgroundColor: '#e8cf9a',
  border: '1px solid rgba(73, 42, 20, 0.72)',
  boxShadow:
    'inset 0 2px 1px rgba(255,255,235,0.9), inset 0 -3px 3px rgba(92,49,20,0.38), 0 2px 3px rgba(0,0,0,0.42)',
}

// Two independently offset courses make the wall read as stacked physical
// tiles rather than one striped ribbon. Each course has an ivory face,
// bevelled top/bottom edges and a dark grout line between individual tiles.
function WallSegment({ orientation, edge }: { orientation: 'horizontal' | 'vertical'; edge: string }) {
  const horizontal = orientation === 'horizontal'
  const courseStyle = (offset: boolean): CSSProperties => ({
    ...TILE_COURSE_BASE,
    backgroundImage: horizontal
      ? 'repeating-linear-gradient(90deg, transparent 0 20px, rgba(78,43,20,0.78) 20px 22px)'
      : 'repeating-linear-gradient(0deg, transparent 0 20px, rgba(78,43,20,0.78) 20px 22px)',
    backgroundPosition: offset ? (horizontal ? '11px 0' : '0 11px') : '0 0',
  })

  return (
    <div
      data-testid={`wall-segment-${edge}`}
      className={`flex h-full w-full overflow-hidden rounded-[3px] bg-amber-950/80 p-px shadow-[0_3px_5px_rgba(0,0,0,0.5)] ${
        horizontal ? 'flex-col' : 'flex-row'
      }`}
    >
      <div data-testid={`wall-course-${edge}-outer`} className="min-h-0 min-w-0 flex-1" style={courseStyle(false)} />
      <div data-testid={`wall-course-${edge}-inner`} className="min-h-0 min-w-0 flex-1" style={courseStyle(true)} />
    </div>
  )
}

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
        <WallSegment orientation="horizontal" edge="top" />
      </Positioned>
      <Positioned
        x={regions.bottom.x + regions.bottom.width / 2}
        y={regions.bottom.y + regions.bottom.height / 2}
        naturalWidth={regions.bottom.width}
        naturalHeight={regions.bottom.height}
      >
        <WallSegment orientation="horizontal" edge="bottom" />
      </Positioned>
      <Positioned
        x={regions.left.x + regions.left.width / 2}
        y={regions.left.y + regions.left.height / 2}
        naturalWidth={regions.left.width}
        naturalHeight={regions.left.height}
      >
        <WallSegment orientation="vertical" edge="left" />
      </Positioned>
      <Positioned
        x={regions.right.x + regions.right.width / 2}
        y={regions.right.y + regions.right.height / 2}
        naturalWidth={regions.right.width}
        naturalHeight={regions.right.height}
      >
        <WallSegment orientation="vertical" edge="right" />
      </Positioned>
    </div>
  )
}
