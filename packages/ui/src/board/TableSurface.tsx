// The stage's background — rendered first inside GameStage so it sits
// behind the wall/seats (all `position: absolute`; DOM order controls
// stacking among siblings with no explicit z-index). Layered CSS gradients
// build a polished wood rail and an inset green felt playing surface. The
// wood tone matches Tile3DFace's own `wood`
// EDGE_GRADIENT hex values, so the table rail and the wall's tile-back
// edges read as the same material rather than two independently-chosen
// browns.
export function TableSurface() {
  return (
    <div
      aria-hidden="true"
      data-testid="table-surface"
      className="absolute inset-0 overflow-hidden rounded-lg border border-[#2b160b] shadow-[inset_0_3px_2px_rgba(255,218,154,0.42),inset_0_-5px_5px_rgba(35,15,5,0.7),inset_3px_0_3px_rgba(255,205,130,0.18),inset_-3px_0_4px_rgba(35,15,5,0.55),0_5px_12px_rgba(0,0,0,0.55)]"
      style={{
        backgroundImage:
          'linear-gradient(100deg, transparent 0 18%, rgba(255,205,125,0.12) 24%, transparent 31% 58%, rgba(45,18,7,0.18) 66%, transparent 74%), repeating-linear-gradient(6deg, rgba(255,225,170,0.08) 0 1px, rgba(76,34,13,0.08) 1px 3px, transparent 3px 8px), linear-gradient(135deg,#9a6232 0%,#71401f 48%,#4b2915 100%)',
      }}
    >
      {/* The 14px inset is what makes the outer 14px of the stage read as
          the table rail on all four sides. stageLayout.ts's RAIL_PX must
          stay equal to it — every seat's identity band is positioned onto
          that rail from there, and Tailwind's JIT can't take a runtime
          value, so the two can only be kept in sync by hand (and by
          stageLayout.test.ts's 'seat identity bands ride the table rail'). */}
      <div
        data-testid="table-felt"
        className="absolute inset-[14px] rounded-[5px] border border-[#2b170c] shadow-[0_0_0_2px_rgba(216,164,91,0.3),inset_0_3px_7px_rgba(0,0,0,0.48),inset_0_0_18px_rgba(0,0,0,0.22)]"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at 48% 43%,rgba(104,190,139,0.28) 0%,transparent 56%), radial-gradient(circle at 18% 24%,rgba(164,219,180,0.075) 0 7%,transparent 19%), radial-gradient(circle at 79% 68%,rgba(0,35,18,0.045) 0 9%,transparent 23%), repeating-linear-gradient(17deg,rgba(240,255,245,0.032) 0 1px,transparent 1px 3px), repeating-linear-gradient(107deg,rgba(0,31,16,0.022) 0 1px,transparent 1px 4px), repeating-linear-gradient(47deg,transparent 0 7px,rgba(255,255,255,0.018) 7px 8px), linear-gradient(145deg,#2d7953 0%,#236845 52%,#185238 100%)',
          backgroundSize: 'auto, 340px 260px, 410px 310px, 5px 5px, 6px 6px, 11px 11px, auto',
        }}
      />
      {/* Mitred corner seams make the four rails read as joined lengths of
          timber instead of a single rounded brown rectangle. */}
      {[
        ['left-0 top-0', '135deg'],
        ['right-0 top-0', '45deg'],
        ['bottom-0 left-0', '45deg'],
        ['bottom-0 right-0', '135deg'],
      ].map(([position, angle], index) => (
        <div
          key={position}
          data-testid={`table-corner-joint-${index}`}
          className={`absolute h-[18px] w-[18px] ${position}`}
          style={{ backgroundImage: `linear-gradient(${angle}, transparent 47%, rgba(44,20,8,0.65) 49%, rgba(231,177,100,0.3) 52%, transparent 54%)` }}
        />
      ))}
    </div>
  )
}
