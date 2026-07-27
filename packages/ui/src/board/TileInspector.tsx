import type { TileTypeId } from '@mahjong-mcr/engine'
import { tileDisplayName } from './tileNames.js'

export interface TileInspectorProps {
  selectedTypeId: TileTypeId | null
  unseenCounts: Record<TileTypeId, number>
}

// SPEC.md §5: clicking any tile (in hand or elsewhere) highlights all
// visible copies of that tile and shows a count — the highlighting itself
// lives on each tile-rendering component (Discards/Melds/HandTiles all
// accept a highlight prop); this is just the count readout.
export function TileInspector({ selectedTypeId, unseenCounts }: TileInspectorProps) {
  if (selectedTypeId === null) return null
  const unseen = unseenCounts[selectedTypeId] ?? 0

  return (
    <div
      data-testid="tile-inspector"
      className="flex items-center gap-2 rounded-full border border-neutral-600 bg-neutral-800 px-4 py-2 text-sm"
    >
      <span className="font-semibold">{tileDisplayName(selectedTypeId)}</span>
      <span className="text-neutral-400">
        {unseen} unseen of 4
      </span>
    </div>
  )
}
