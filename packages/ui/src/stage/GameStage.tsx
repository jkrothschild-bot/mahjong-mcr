import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { StageScaleContext } from './StageScaleContext.js'
import { STAGE_HEIGHT, STAGE_WIDTH } from './stageLayout.js'

export interface GameStageProps {
  children: ReactNode
}

// The single fixed 1024x768 design-resolution coordinate space every game
// object (wall, hands, discards, melds) is absolutely positioned inside —
// scaled to whatever room is actually available via one CSS transform. The
// outer "measure" div is `flex-1 min-h-0` so its real rendered size
// reflects the actual remaining space in Board.tsx's flex-column layout
// (not just its own width, the way a CSS `aspect-ratio` box would, which
// can't independently respect a height constraint) — that's what a
// ResizeObserver on it reports. Scale is capped at 1 so the stage is never
// upscaled past its native resolution (would blur the tile art).
export function GameStage({ children }: GameStageProps) {
  const measureRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const el = measureRef.current
    if (!el) return

    function applyScale(width: number, height: number) {
      if (width === 0 || height === 0) return
      setScale(Math.min(width / STAGE_WIDTH, height / STAGE_HEIGHT, 1))
    }

    const rect = el.getBoundingClientRect()
    applyScale(rect.width, rect.height)

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) applyScale(entry.contentRect.width, entry.contentRect.height)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={measureRef} className="flex w-full min-h-0 flex-1 items-center justify-center">
      <div
        data-testid="game-stage"
        className="relative shrink-0 overflow-hidden rounded-lg border border-neutral-700 bg-neutral-950"
        style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT, transform: `scale(${scale})` }}
      >
        <StageScaleContext.Provider value={scale}>{children}</StageScaleContext.Provider>
      </div>
    </div>
  )
}
