// dnd-kit can report the same collision target many times while the pointer
// moves within one tile. A clink belongs to crossing into a different tile,
// not to every pointer event; sentinels/gaps never make sound.
export function isNewDragClinkTarget(previousTileId: number | null, activeTileId: number, candidate: unknown): candidate is number {
  return typeof candidate === 'number' && candidate !== activeTileId && candidate !== previousTileId
}
