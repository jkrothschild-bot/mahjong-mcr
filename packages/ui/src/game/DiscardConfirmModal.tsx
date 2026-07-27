import { typeIdOfInstance, type TileInstanceId } from '@mahjong-mcr/engine'
import { tileDisplayName } from '../board/tileNames.js'

export interface DiscardConfirmModalProps {
  tileId: TileInstanceId | null
  onConfirm: () => void
  onCancel: () => void
}

export function DiscardConfirmModal({ tileId, onConfirm, onCancel }: DiscardConfirmModalProps) {
  if (tileId === null) return null
  const name = tileDisplayName(typeIdOfInstance(tileId))

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50">
      <div role="dialog" aria-label="Confirm discard" className="flex flex-col gap-4 rounded-lg border border-neutral-600 bg-neutral-800 p-5">
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
