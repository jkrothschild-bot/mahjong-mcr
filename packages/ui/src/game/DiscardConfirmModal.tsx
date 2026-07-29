import { typeIdOfInstance, type TileInstanceId } from '@mahjong-mcr/engine'
import { tileDisplayName } from '../board/tileNames.js'
import { useSettingsContext } from '../settings/SettingsContext.js'
import { TileFaceContent } from '../tiles/TileFaceContent.js'
import { tileFaceClassName } from '../tiles/tileStyles.js'

export interface DiscardConfirmModalProps {
  tileId: TileInstanceId | null
  onConfirm: () => void
  onCancel: () => void
}

export function DiscardConfirmModal({ tileId, onConfirm, onCancel }: DiscardConfirmModalProps) {
  const { tileScale } = useSettingsContext()
  if (tileId === null) return null
  const typeId = typeIdOfInstance(tileId)
  const name = tileDisplayName(typeId)

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50">
      <div role="dialog" aria-label="Confirm discard" className="flex flex-col items-center gap-4 rounded-lg border border-neutral-600 bg-neutral-800 p-5">
        <div className={tileFaceClassName({ scale: tileScale })}>
          <TileFaceContent typeId={typeId} />
        </div>
        <p className="text-sm">
          Discard <b>{name}</b>?
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-md border border-neutral-600 px-4 text-sm hover:bg-neutral-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-11 rounded-md border border-amber-400 bg-amber-500 px-4 text-sm font-semibold text-neutral-900 hover:bg-amber-400"
          >
            Discard
          </button>
        </div>
      </div>
    </div>
  )
}
