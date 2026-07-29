import { typeIdOfInstance, type Meld } from '@mahjong-mcr/engine'
import { useSettingsContext } from '../settings/SettingsContext.js'
import { TileFaceContent } from '../tiles/TileFaceContent.js'
import { tileFaceClassName } from '../tiles/tileStyles.js'

export interface MeldsProps {
  seat: number
  melds: readonly Meld[]
  selectedTypeId?: string
  onTileClick?: (id: number) => void
}

// Renders every meld tile face-up, including concealed kongs. Real-table
// convention hides 2 of a concealed kong's 4 tiles from *other physical
// players* — that doesn't map onto a single-player trainer, where
// concealment already only matters for scoring (conveyed via fan names on
// the score screen), not table secrecy. Documented simplification, not a bug.
export function Melds({ seat, melds, selectedTypeId, onTileClick }: MeldsProps) {
  const { tileScale } = useSettingsContext()
  if (melds.length === 0) return null
  return (
    <div aria-label={`Seat ${seat} melds`} className="flex flex-wrap gap-2">
      {melds.map((meld) => (
        <div key={meld.id} data-testid={`meld-${meld.id}`} role="list" aria-label={`${meld.kind} meld`} className="flex gap-0.5">
          {meld.tiles.map((id, index) => {
            const typeId = typeIdOfInstance(id)
            return (
              <div
                key={id}
                data-tile-id={id}
                data-testid={`meld-tile-${meld.id}-${index}`}
                role="listitem"
                onClick={onTileClick ? () => onTileClick(id) : undefined}
                className={tileFaceClassName({
                  highlighted: selectedTypeId === typeId,
                  extra: onTileClick ? 'cursor-pointer' : undefined,
                  scale: tileScale,
                })}
              >
                <TileFaceContent typeId={typeId} />
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
