import type { TileTypeId } from '@mahjong-mcr/engine'
import { tileImageSrc } from './tileImages.js'

export interface TileFaceContentProps {
  typeId: TileTypeId
}

// The inner content of a tile box — never a wrapper div of its own, so
// every call site keeps its own existing wrapper (data-testid, role,
// onClick/pointer handlers) untouched. Renders the real tile-face art when
// one exists (34 standard types); otherwise falls back to the plain text
// label (flowers/seasons — no art yet, see tileImages.ts).
//
// The <img> stays alt="" (decorative) and the sr-only span carries the
// accessible name instead, so screen readers aren't double-announced.
// Text-content-based test assertions (`toHaveTextContent(typeId)`) keep
// working unchanged as a result — .textContent includes visually-hidden
// text nodes regardless of CSS.
export function TileFaceContent({ typeId }: TileFaceContentProps) {
  const src = tileImageSrc(typeId)
  if (!src) return <>{typeId}</>
  return (
    <>
      <img src={src} alt="" draggable={false} className="pointer-events-none h-full w-full select-none object-contain" />
      <span className="sr-only">{typeId}</span>
    </>
  )
}
