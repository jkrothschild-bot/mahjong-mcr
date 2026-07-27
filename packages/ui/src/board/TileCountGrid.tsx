import { parseSuited, type TileTypeId } from '@mahjong-mcr/engine'
import { ALL_TILE_TYPE_IDS, tileDisplayName } from './tileNames.js'

export interface TileCountGridProps {
  open: boolean
  unseenCounts: Record<TileTypeId, number>
  onClose: () => void
}

const SUIT_SWATCH_CLASSES: Record<'C' | 'D' | 'B' | 'honor', string> = {
  C: 'bg-red-900 text-red-100',
  D: 'bg-blue-900 text-blue-100',
  B: 'bg-green-900 text-green-100',
  honor: 'bg-neutral-700 text-neutral-200',
}

function swatchLabel(typeId: TileTypeId): string {
  const parsed = parseSuited(typeId)
  return parsed ? String(parsed.rank) : typeId
}

function swatchClass(typeId: TileTypeId): string {
  const parsed = parseSuited(typeId)
  return SUIT_SWATCH_CLASSES[parsed ? parsed.suit : 'honor']
}

// SPEC.md §9: a small reference panel listing all 34 tile types with how
// many of each remain unseen — turns the tile inspector's one-at-a-time
// lookup into an always-available overview. Direct port of the concept
// already validated in docs/Mockups/mahjong-seated-table-prototype-v8.html
// (buildTileCountGrid), using real engine types/derivation instead of that
// mockup's ad-hoc DOM-scrape.
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
                <div className={`flex h-8 w-full items-center justify-center rounded font-bold ${swatchClass(typeId)}`}>
                  {swatchLabel(typeId)}
                </div>
                <div className={`text-sm font-semibold ${unseen === 0 ? 'text-red-400' : ''}`}>{unseen}</div>
                <div className="text-[10px] leading-tight text-neutral-400">{tileDisplayName(typeId)}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
