import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { StageMetricsContext, type StageMetrics } from './StageMetricsContext.js'
import { computeDesignWidth, MIN_DESIGN_WIDTH, STAGE_HEIGHT } from './stageLayout.js'

export interface GameStageProps {
  children: ReactNode
}

// The design-resolution coordinate space every game object (wall, hands,
// discards, melds) is absolutely positioned inside — scaled to whatever room
// is actually available via one CSS transform. Height is fixed
// (STAGE_HEIGHT); width is variable (KICKOFF-phase2-addendum-anchoring.md —
// computeDesignWidth derives it from the measured element's own aspect
// ratio, clamped to [MIN_DESIGN_WIDTH, MAX_DESIGN_WIDTH]), which is what lets
// the board actually widen on a desktop monitor instead of always rendering
// at a fixed 1024px design width regardless of how wide the window is. The
// outer "measure" div is `flex-1 min-h-0` so its real rendered size reflects
// the actual remaining space in Board.tsx's flex-column layout (not just its
// own width, the way a CSS `aspect-ratio` box would, which can't
// independently respect a height constraint) — that's what a ResizeObserver
// on it reports.
//
// Scale is capped at MAX_SCALE (1.5), not 1: on a desktop monitor wider
// than the original fixed 1024x768 native stage, capping at exactly native
// size left the board sitting small in a sea of empty space (reported).
// Upscaling raster tile-face content (the vendored PNG art baked into each
// face SVG, see tiles/tileImages.ts) risked blur in principle, but the
// source PNGs are 600x800 shown at ~140 SVG units within a 220-unit-wide
// tile — even at 1.5x scale on large hand tiles (the biggest box, ~76px *
// 1.5 = 114px CSS width) the glyph only ever needs ~88 CSS px, nowhere near
// enough to exhaust that headroom, even at 2x device pixel ratio. 1.5x is a
// deliberate ceiling (not "uncapped") rather than letting an ultrawide
// monitor blow the board up arbitrarily. Now that designWidth absorbs most
// of the available aspect ratio, MAX_SCALE binds far more often than it used
// to — see KICKOFF-tile-legibility-phase2.md §2.4's request to report this.
const MAX_SCALE = 1.5

export function GameStage({ children }: GameStageProps) {
  const measureRef = useRef<HTMLDivElement>(null)
  const [metrics, setMetrics] = useState<StageMetrics>({ scale: 1, designWidth: MIN_DESIGN_WIDTH })

  useLayoutEffect(() => {
    const el = measureRef.current
    if (!el) return

    // designWidth and scale are computed together, from the same
    // measurement, in the same callback, and published together in one
    // `setMetrics` — this is the single producer KICKOFF-phase2-addendum-
    // anchoring.md's plumbing decision relies on to guarantee the CSS width
    // below and every getSeatRegions/getWallSegmentRegion consumer
    // downstream (reading designWidth via StageMetricsContext) can never
    // disagree about the current design width.
    function applyMetrics(width: number, height: number) {
      if (width === 0 || height === 0) return
      const designWidth = computeDesignWidth(width, height)
      const scale = Math.min(width / designWidth, height / STAGE_HEIGHT, MAX_SCALE)
      setMetrics({ scale, designWidth })
    }

    const rect = el.getBoundingClientRect()
    applyMetrics(rect.width, rect.height)

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) applyMetrics(entry.contentRect.width, entry.contentRect.height)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={measureRef} className="flex w-full min-h-0 flex-1 items-center justify-center">
      <div
        data-testid="game-stage"
        className="relative shrink-0 overflow-hidden rounded-lg border border-neutral-700 bg-neutral-950"
        style={{ width: metrics.designWidth, height: STAGE_HEIGHT, transform: `scale(${metrics.scale})` }}
      >
        <StageMetricsContext.Provider value={metrics}>{children}</StageMetricsContext.Provider>
      </div>
    </div>
  )
}
