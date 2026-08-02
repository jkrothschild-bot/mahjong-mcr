import { Tile3DFace } from './Tile3DFace.js'
import { botBackImageSrc } from './tileImages.js'

// The inner content of a face-down tile box — mirrors TileFaceContent's own
// shape (a Tile3DFace wrapper around a plain image), so a caller can swap
// between the two without touching anything about its own wrapping div
// (data-testid, role, size classes, click handler). Originally SeatLine.tsx's
// own inline concealed-bot-hand rendering; factored out once
// KICKOFF-phase9-human-melds.md item 4 needed the identical back-tile
// content in a second place (a concealed kong's face-down outer two tiles,
// in both HandTiles.tsx and SeatLine.tsx).
export function TileBackContent() {
  return (
    <Tile3DFace tone="back">
      <img src={botBackImageSrc()} alt="" draggable={false} className="pointer-events-none h-full w-full select-none object-contain" />
    </Tile3DFace>
  )
}
