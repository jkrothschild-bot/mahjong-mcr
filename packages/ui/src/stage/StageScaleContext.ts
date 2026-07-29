import { createContext, useContext } from 'react'

// GameStage's current CSS scale factor (1024x768 design space -> actual
// viewport pixels). Everything inside the stage is sized/positioned in
// design-space pixels and looks right automatically, because it all sits
// inside the one scaled container. dnd-kit's DragOverlay (M8 Step 4) is the
// first thing that needs to render *outside* that container (it portals to
// document.body so a dragged tile can visually escape the stage's
// overflow-hidden clip) — anything doing that needs this factor to render
// at a size that still matches its on-stage sibling. Defaults to 1 so
// components rendered without a GameStage ancestor (e.g. in isolation in
// tests) behave as if unscaled.
export const StageScaleContext = createContext(1)

export function useStageScale(): number {
  return useContext(StageScaleContext)
}
