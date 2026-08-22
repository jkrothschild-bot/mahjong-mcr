import { motion } from 'motion/react'
import { typeIdOfInstance, type Seat, type TileInstanceId } from '@mahjong-mcr/engine'
import { Positioned } from '../stage/Positioned.js'
import { useStageMetrics } from '../stage/StageMetricsContext.js'
import { getBoardRegions, type Rect } from '../stage/stageLayout.js'
import { TileBackContent } from '../tiles/TileBackContent.js'
import { TileFaceContent } from '../tiles/TileFaceContent.js'
import type { InitialDealFrame } from '../game/initialDealPresentation.js'

const SEAT_NAMES: Record<Seat, string> = { 0: 'You', 1: 'Left player', 2: 'Across player', 3: 'Right player' }

function DealtTile({ id, faceUp }: { id: TileInstanceId; faceUp: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0.2, scale: 0.65 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.12, ease: 'easeOut' }}
      className={`h-9 w-6 shrink-0 overflow-hidden rounded border shadow-sm ${
        faceUp ? 'border-neutral-500 bg-neutral-100 text-neutral-900' : 'border-[#d6c28e] bg-[#0b4b50] text-teal-100'
      }`}
    >
      {faceUp ? <TileFaceContent typeId={typeIdOfInstance(id)} /> : <TileBackContent />}
    </motion.div>
  )
}

function DealRack({ seat, region, frame }: { seat: Seat; region: Rect; frame: InitialDealFrame }) {
  const concealed = frame.concealedBySeat[seat]
  const flowers = frame.flowersBySeat[seat]
  const vertical = seat === 1 || seat === 3
  return (
    <Positioned
      x={region.x + region.width / 2}
      y={region.y + region.height / 2}
      naturalWidth={region.width}
      naturalHeight={region.height}
    >
      <div className={`flex h-full w-full items-center justify-center gap-1 ${vertical ? 'flex-col flex-wrap' : 'flex-row'}`}>
        <span className="rounded-full bg-neutral-950/80 px-2 py-1 text-[10px] font-semibold text-neutral-200">
          {SEAT_NAMES[seat]} · {concealed.length + flowers.length}
        </span>
        <div className={`flex gap-0.5 ${vertical ? 'max-h-full flex-col flex-wrap' : 'flex-row'}`}>
          {concealed.map((id) => <DealtTile key={id} id={id} faceUp={seat === 0} />)}
        </div>
        {flowers.length > 0 && (
          <div className={`flex gap-0.5 rounded border border-amber-300/60 p-0.5 ${vertical ? 'flex-col' : 'flex-row'}`}>
            {flowers.map((id) => <DealtTile key={id} id={id} faceUp />)}
          </div>
        )}
      </div>
    </Positioned>
  )
}

// Lightweight new-hand-only racks. They intentionally omit drag sensors,
// meld/discard machinery, and the full interactive seat layout: none exists
// during a deal, and rebuilding it for every four-tile group made a short
// teaching sequence expensive on iPad. The authoritative final Board mounts
// once the presentation completes.
export function InitialDealHands({ frame }: { frame: InitialDealFrame }) {
  const { designWidth } = useStageMetrics()
  const regions = getBoardRegions(designWidth)
  const seatRegions: Record<Seat, Rect> = {
    0: regions.human.row,
    1: regions.west.line,
    2: regions.north.line,
    3: regions.east.line,
  }
  return <>{([0, 1, 2, 3] as const).map((seat) => <DealRack key={seat} seat={seat} region={seatRegions[seat]} frame={frame} />)}</>
}
