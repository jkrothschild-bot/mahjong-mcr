// The stage's background — rendered first inside GameStage so it sits
// behind the wall/seats (all `position: absolute`; DOM order controls
// stacking among siblings with no explicit z-index). Two flat CSS gradient
// layers, no images: a wood "rail" filling the stage, and an inset green
// "felt" playing surface. The wood tone matches Tile3DFace's own `wood`
// EDGE_GRADIENT hex values, so the table rail and the wall's tile-back
// edges read as the same material rather than two independently-chosen
// browns.
export function TableSurface() {
  return (
    <div aria-hidden="true" className="absolute inset-0 rounded-lg bg-gradient-to-br from-[#8a6d3f] to-[#5c4626]">
      {/* The 14px inset is what makes the outer 14px of the stage read as
          the table rail on all four sides. stageLayout.ts's RAIL_PX must
          stay equal to it — every seat's identity band is positioned onto
          that rail from there, and Tailwind's JIT can't take a runtime
          value, so the two can only be kept in sync by hand (and by
          stageLayout.test.ts's 'seat identity bands ride the table rail'). */}
      <div
        className="absolute inset-[14px] rounded-md"
        style={{ background: 'radial-gradient(ellipse at center, #1d5c3a, #0f3d26)' }}
      />
    </div>
  )
}
