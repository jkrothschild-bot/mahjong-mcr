# Phase 9 — the human's melds must not look like their concealed hand

Read `CLAUDE.md`, `SPEC.md` (§5, §5a, §5c) and `PLAN.md` §2 before starting.

## The problem

In `packages/ui/src/hand/HandTiles.tsx`, the human's melds render through the
**exact same** `tileFaceClassName(...)` call as their concealed tiles — same size,
same `TILE_FACE_CLASSES`, same `TILE_3D_CONTEXT` shadow. The only thing separating
them is `MELD_GAP` (16px) against `TILE_GAP` (4px). A 12px gap is carrying the
entire distinction, and it does not read.

The human seat is the only place this is a problem. Bot seats show indigo
`TILE_BACK_CLASSES` backs against neutral faces, so their melds are already obvious.

This fails `SPEC.md` §5a item "what's in my hand, answerable at a glance": a melded
set is committed, public, unorderable and scores differently from concealed tiles,
and none of that is visible.

## Budget — read this before designing anything

- **Horizontally there is nothing spare.** `fitRowTileWidth` already shrinks the row
  toward `HAND_TILE_WIDTH_FLOOR`; melds compete with 13 concealed slots plus a
  flower reserve. **No change may increase the row's width demand.**
- **Vertically there is some.** `HUMAN_ROW_H` is 140. `TILE_BOX_PX.normal` is 92 tall
  → 48px slack. But `TILE_BOX_PX.large` is **116 tall → only 24px slack**. Every
  vertical change below must be verified at `large`, not just `normal`.
- `-translate-y-1` (4px) is already taken by `TILE_JUST_DRAWN_LIFT_CLASSES`. Any meld
  offset must be visibly different in magnitude so the two cues can't be confused.

## The four changes

Items 1–3 are one change and must ship together — each is independently weak, and
they are what make "held in your hand" vs "laid on the table" read. Item 4 is
separable and is a correctness fix, not a cosmetic one.

### 1. Melds sit on a lower baseline

Concealed tiles are held up toward the player; melds are laid flat on the table.
Drop the meld block by roughly 10–12px at `normal`.

Prefer doing this as a CSS transform on the meld tile's own div rather than by
changing `packGroupsMajor` / `placeGroup` — the row solver's width math must stay
untouched, and `stageLayout.ts`'s geometry is covered by golden tests. Solve the
`large` offset separately against the 24px slack; do not assume the same number works.

### 2. A recessed shelf behind each meld

One inset panel per meld — darker fill, inner shadow — sized to that meld's own
tiles. This also fixes something the gap does not: with three melds in a row you
currently cannot count set boundaries at a glance.

Derive each shelf's rect from the already-computed `meldPlaced` extents for that
meld's tile range. Render it as its own `Positioned` element **behind** the tiles
(DOM order — these are absolutely positioned siblings with no z-index). Background
only: it must add zero width demand.

### 3. Flatten the meld tile's shadow

`TILE_3D_CONTEXT` gives every tile `shadow-[2px_3px_4px_rgba(0,0,0,0.35)]`, which
implies a tile tilted toward the player. A tile lying flat needs a tighter, lower,
softer shadow.

**Do not dim or tint the meld tile's face.** `opacity-40` is already the drag-dimmed
state, and `CLAUDE.md` is explicit that face glyph legibility is non-negotiable.
Change the shadow and the border; leave `TILE_FACE_CLASSES`' fill alone.

### 4. Concealed kongs render with the outer two tiles face-down

`packages/engine/src/meld.ts` already carries everything needed and **none of it
reaches the UI today**:

```ts
kind: 'chow' | 'pung' | 'kong'
exposure: 'concealed' | 'exposed'
kongSource?: 'concealed' | 'exposedFromDiscard' | 'promotedFromPung'
claimedFrom?: { seat, discardTile }
```

A concealed kong scores differently from a melded one, so a *trainer* that draws
them identically is teaching the wrong thing. Render `kongSource === 'concealed'`
with tiles 1 and 4 face-down (`TILE_BACK_CLASSES` + `botBackImageSrc()` from
`tiles/tileImages.ts`) and 2 and 3 face-up.

Apply this to bot seats too (`SeatLine.tsx`) — the same information is missing
there. If that turns out to be more than a small change, do the human seat, and
report the bot seat as a follow-up rather than half-doing it.

**This is display-only. Do not touch scoring.** If implementing it surfaces a
discrepancy in how the engine classifies a kong, stop: add the failing hand as a
permanent test fixture first, per `CLAUDE.md`, then fix.

## Explicitly NOT in this phase

- **Rotating the claimed tile 90° to encode the source seat.** Authentic, and
  `claimedFrom` already holds the data, but a rotated tile is 92px wide instead of
  60px (~+32px per meld) out of a width budget that doesn't exist, and Phase 7
  explicitly rejected rotation as costing glyph readability. If source-seat
  attribution is wanted later, put a small seat letter on the shelf panel from
  item 2 — that costs nothing.
- Text captions ("Chow"/"Pung"/"Kong") under melds. Decide after looking at 1–3;
  they may make it unnecessary, and captions are UI chrome on a table surface
  (§5c risk).
- Any change to `stageLayout.ts` geometry, `fitRowTileWidth`, the flower block, the
  discard field, or bot seat *layout*. Item 4 touches bot seat *rendering* only.

## Constraints

- **Overflow is additive, never rescaling** (`CLAUDE.md` standing rule). Claiming a
  meld mid-hand must not reflow or re-shrink the row. The shelf and the offset are
  visual only; the width solve must produce identical numbers before and after.
- **Stable tile IDs.** A face-down concealed-kong tile is the *same* tile object
  rendered differently — never a placeholder, never destroyed and recreated. It
  keeps its `layoutId` so the deferred movement animation still works.
- Melds stay non-draggable and non-reorderable. A committed meld is not
  player-orderable state.
- The tile inspector must keep working on meld tiles, including the face-down ones
  (clicking a concealed-kong back should still highlight matching tiles — decide and
  record the ruling if you think it shouldn't, since it leaks information).
- TypeScript strict. Typecheck **and** the full suite green before every commit.
  Never commit red.

## Before you start

The most recent change (seat identity bands moved onto the table rail —
`stageLayout.ts`, `Seat.tsx`, `TableSurface.tsx`, `stageLayout.test.ts`) was written
but **never executed**. Run the full suite first and confirm it is green before
layering this phase on top. The golden board snapshot in `stageLayout.test.ts`
changed, so that is the first thing to check.

## Verification

1. Screenshots at both `tileScale` settings, at designWidth 1920 / 1440 / 1024, of a
   human hand with: (a) no melds, (b) one chow, (c) three melds including a kong,
   (d) four kongs plus flowers — the worst case, where the row is at its width floor.
   Use the dev-only state injection harness rather than trying to play into it.
2. **Assert the width solve is unchanged.** A test that the row's tile width and
   `layout.scale` for a given hand+meld configuration are identical to the values
   before this phase — that is what proves items 1–3 cost nothing horizontally.
3. A test that a `kongSource === 'concealed'` meld renders exactly two backs and two
   faces, and that all four tiles keep their original `TileInstanceId`s.
4. Check the result against `SPEC.md` §5a **and** §5c separately — these are two
   bars. "Can I tell at a glance which tiles are committed?" and "does the meld read
   as physically laid on the table?" are different questions and both must pass.
5. Report honestly if the shelf makes the row look busy at four kongs. A partial
   result plus a clear statement of what still doesn't read is the expected outcome,
   not a failure.
