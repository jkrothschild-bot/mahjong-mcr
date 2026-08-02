import { createContext, useContext } from 'react'
import { MIN_DESIGN_WIDTH } from './stageLayout.js'

export interface StageMetrics {
  // GameStage's current CSS scale factor (design space -> actual viewport
  // pixels). Everything inside the stage is sized/positioned in design-space
  // pixels and looks right automatically, because it all sits inside the one
  // scaled container. dnd-kit's DragOverlay (M8 Step 4) is the first thing
  // that needs to render *outside* that container (it portals to
  // document.body so a dragged tile can visually escape the stage's
  // overflow-hidden clip) — anything doing that needs this factor to render
  // at a size that still matches its on-stage sibling.
  scale: number
  // The design canvas's current width (KICKOFF-phase2-addendum-anchoring.md)
  // — variable, unlike STAGE_HEIGHT. getSeatRegions/getWallSegmentRegion
  // consumers (Seat.tsx, WallSegment.tsx) read this instead of a fixed
  // constant so seat panels stay anchored correctly as the canvas widens.
  // Already quantised (stageLayout.ts's quantizeDesignWidth) by the time it
  // reaches here — GameStage.tsx's ResizeObserver callback is the one
  // producer for both this and `scale`, so they can never disagree.
  designWidth: number
}

// Renamed from StageScaleContext (Phase 2 addendum's plumbing decision):
// designWidth has the same producer (GameStage.tsx's ResizeObserver
// callback), the same consumer path, and the same lifetime as scale — a
// second parallel context for an identically-travelling value would be pure
// cost. Defaults to `{ scale: 1, designWidth: MIN_DESIGN_WIDTH }` so
// components rendered without a GameStage ancestor (e.g. in isolation in
// tests) behave as if unscaled at the design canvas's floor width.
export const StageMetricsContext = createContext<StageMetrics>({ scale: 1, designWidth: MIN_DESIGN_WIDTH })

export function useStageMetrics(): StageMetrics {
  return useContext(StageMetricsContext)
}
