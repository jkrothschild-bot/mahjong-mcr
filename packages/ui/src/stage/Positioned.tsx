import type { ReactNode } from 'react'

export interface PositionedProps {
  // Final, already-scaled stage-space center (from stageLayout.ts's
  // placeGroup) — center-anchored is the simplest placement model.
  x: number
  y: number
  // The child's own intrinsic (unscaled) size — e.g. tileFaceClassName's
  // fixed Tailwind box size. Positioned never overrides that styling.
  naturalWidth: number
  naturalHeight: number
  // The group's fitScale (computeRowPositions/computeGridPositions) — 1
  // unless the group didn't fit its region at natural size.
  scale?: number
  // Degrees; defaults to 0 — Step 1 doesn't rotate opponent hands yet (see
  // stageLayout.ts's SEAT_REGIONS comment).
  rotation?: number
  className?: string
  children: ReactNode
}

// Places a game object at an explicit stage-space center. When `scale` < 1,
// wraps children in an inner top-left-anchored `transform: scale()` layer
// so the child keeps using its own natural fixed-size styling unmodified —
// skipped entirely when scale is exactly 1 (the common case), so no extra
// DOM nesting is added unless a group actually needed to shrink to fit.
export function Positioned({ x, y, naturalWidth, naturalHeight, scale = 1, rotation = 0, className, children }: PositionedProps) {
  return (
    <div
      className={`absolute ${className ?? ''}`}
      style={{
        left: x,
        top: y,
        width: naturalWidth * scale,
        height: naturalHeight * scale,
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
      }}
    >
      {scale === 1 ? (
        children
      ) : (
        <div style={{ width: naturalWidth, height: naturalHeight, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          {children}
        </div>
      )}
    </div>
  )
}
