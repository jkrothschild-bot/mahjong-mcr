import type { TileTypeId } from '@mahjong-mcr/engine'
import { FlowerTileFace } from './FlowerTileFace.js'
import { tileImageSrc } from './tileImages.js'

export interface TileFaceContentProps {
  typeId: TileTypeId
}

// The inner content of a tile box — never a wrapper div of its own, so
// every call site keeps its own existing wrapper (data-testid, role,
// onClick/pointer handlers) untouched. Renders the real tile-face PNG when
// one exists (the 34 standard types); flowers/seasons have no PNG art
// (tileImages.ts's known gap) but still get a real, distinct face via
// FlowerTileFace rather than plain text.
//
// The image/SVG stays visually decorative and the sr-only span carries the
// accessible name instead, so screen readers aren't double-announced.
// Text-content-based test assertions (`toHaveTextContent(typeId)`) keep
// working unchanged as a result — .textContent includes visually-hidden
// text nodes regardless of CSS.
export function TileFaceContent({ typeId }: TileFaceContentProps) {
  const src = tileImageSrc(typeId)
  return (
    <>
      {src ? (
        <img src={src} alt="" draggable={false} className="pointer-events-none h-full w-full select-none object-contain" />
      ) : (
        <FlowerTileFace typeId={typeId} />
      )}
      <span className="sr-only">{typeId}</span>
    </>
  )
}
