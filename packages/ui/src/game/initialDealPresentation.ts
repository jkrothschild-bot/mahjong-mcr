import {
  buildWall,
  isFlowerOrSeason,
  performInitialDeal,
  type Seat,
  type TileInstanceId,
  type Wall,
} from '@mahjong-mcr/engine'

export interface InitialDealFrame {
  wall: Wall
  concealedBySeat: Record<Seat, readonly TileInstanceId[]>
  flowersBySeat: Record<Seat, readonly TileInstanceId[]>
  activeSeat?: Seat
  phase: 'wall-built' | 'primary-deal' | 'flower-replacement'
}

function emptySeatTiles(): Record<Seat, TileInstanceId[]> {
  return { 0: [], 1: [], 2: [], 3: [] }
}

function snapshotSeatTiles(source: Record<Seat, TileInstanceId[]>): Record<Seat, readonly TileInstanceId[]> {
  return { 0: [...source[0]], 1: [...source[1]], 2: [...source[2]], 3: [...source[3]] }
}

// Reconstructs presentation frames from the same pure engine operation that
// creates GameState. No animation cursor is persisted and no tile source is
// guessed by the UI: every frame carries the authoritative wallAfter from
// performInitialDeal. A remount can therefore skip directly to GameState.
export function buildInitialDealFrames(seed: number, dealerSeat: Seat): readonly InitialDealFrame[] {
  const initialWall = buildWall(seed)
  const result = performInitialDeal(initialWall, dealerSeat)
  const concealed = emptySeatTiles()
  const flowers = emptySeatTiles()
  const seatsWithExposedFlowers = new Set<Seat>()
  const frames: InitialDealFrame[] = [{
    wall: initialWall,
    concealedBySeat: snapshotSeatTiles(concealed),
    flowersBySeat: snapshotSeatTiles(flowers),
    phase: 'wall-built',
  }]

  for (const step of result.steps) {
    if (step.kind === 'flower-replacement' && !seatsWithExposedFlowers.has(step.seat)) {
      seatsWithExposedFlowers.add(step.seat)
      const initialFlowers = concealed[step.seat].filter(isFlowerOrSeason)
      concealed[step.seat] = concealed[step.seat].filter((tile) => !isFlowerOrSeason(tile))
      flowers[step.seat].push(...initialFlowers)
    }

    for (const tile of step.tiles) {
      if (step.kind === 'flower-replacement' && isFlowerOrSeason(tile)) flowers[step.seat].push(tile)
      else concealed[step.seat].push(tile)
    }

    frames.push({
      wall: step.wallAfter,
      concealedBySeat: snapshotSeatTiles(concealed),
      flowersBySeat: snapshotSeatTiles(flowers),
      activeSeat: step.seat,
      phase: step.kind === 'flower-replacement' ? 'flower-replacement' : 'primary-deal',
    })
  }

  return frames
}
