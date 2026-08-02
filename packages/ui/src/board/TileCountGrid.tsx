import type { TileTypeId } from '@mahjong-mcr/engine'
import { TileFaceContent } from '../tiles/TileFaceContent.js'
import { tileFaceCompactClassName } from '../tiles/tileStyles.js'
import { ALL_TILE_TYPE_IDS, tileDisplayName } from './tileNames.js'

export interface TileCountGridProps {
  open: boolean
  unseenCounts: Record<TileTypeId, number>
  onClose: () => void
}

// SPEC.md §9: a small reference panel listing all 34 tile types with how
// many of each remain unseen — turns the tile inspector's one-at-a-time
// lookup into an always-available overview. Originally a colored suit
// swatch + rank letter (docs/Mockups/mahjong-seated-table-prototype-v8.html's
// buildTileCountGrid concept); now the same real tile-face art every other
// tile box on the board renders (TileFaceContent, at the compact size the
// hint tabs already use for inline tile references) — CLAUDE.md's numerals/
// letters-baked-into-the-face rule applies here same as anywhere else a tile
// is shown, not just on the board itself.
export function TileCountGrid({ open, unseenCounts, onClose }: TileCountGridProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Tile-count grid"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[80vh] w-full max-w-2xl flex-col gap-3 overflow-y-auto rounded-lg border border-neutral-600 bg-neutral-800 p-5"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Tile counts</h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 min-w-11 rounded-md border border-neutral-600 px-3 text-sm hover:bg-neutral-700"
          >
            Close
          </button>
        </div>
        <div className="grid grid-cols-9 gap-2">
          {ALL_TILE_TYPE_IDS.map((typeId) => {
            const unseen = unseenCounts[typeId] ?? 0
            return (
              <div key={typeId} data-testid={`tile-count-${typeId}`} className="flex flex-col items-center gap-1 rounded-md border border-neutral-700 p-1.5 text-center">
                <div className={tileFaceCompactClassName({ extra: unseen === 0 ? 'opacity-40' : undefined })}>
                  <TileFaceContent typeId={typeId} />
                </div>
                <div data-testid={`tile-count-value-${typeId}`} className={`text-sm font-semibold ${unseen === 0 ? 'text-red-400' : ''}`}>
                  {unseen}
                </div>
                <div className="text-[10px] leading-tight text-neutral-400">{tileDisplayName(typeId)}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
