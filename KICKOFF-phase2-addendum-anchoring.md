# Addendum to Phase 2 — anchoring approach & plumbing decisions

Read alongside `KICKOFF-tile-legibility-phase2.md`. This **replaces** 2.1's instruction
to make seat regions "proportional", and settles the two open questions from the audit.

## Correction: anchor regions, do not scale them

Phase 2's snippet implied re-deriving the seat tables as formulas of `designWidth`. That
was wrong and is the source of the "budget must hold across `[1024, 1920]`" risk the
audit raised.

**Almost no region should grow with `designWidth`.** The hand-tuned width budget
(melds/discards vs. backs) stays exactly as-is. Only the *reference edge* for `x`
changes. Express each region as an anchor policy, not a scale factor.

### Per-region policy — apply exactly this

| region | anchor | width | x |
|---|---|---|---|
| offset-0 (human) `header`/`flowers`/`melds`/`discards` | left | **unchanged (992)** | `16` — no change |
| offset-0 `hand` | left, **stretch** | `designWidth − 32` | `16` — no change |
| offset-1 (left seat), all regions | left | unchanged | `8` — no change |
| offset-2 (across), all regions | centre | **unchanged (624)** | `(designWidth − 624) / 2` |
| offset-3 (right seat), all regions | right | **unchanged** | `designWidth − width − margin` |
| `WALL_SEGMENT_REGION` | centre | **unchanged (200)** | `(designWidth − 200) / 2` |

`margin` for offset-3 is whatever the existing literal implies — derive it once per
region from today's value (e.g. `header.x:844`, `width:172` ⇒ `1024 − 844 − 172 = 8`)
and keep it as a named constant. Do not invent new margins.

**`hand` is the only width that changes.** Leave the human's
`header`/`flowers`/`melds`/`discards` at 992. Widen them later only if a screenshot
demonstrates a need — that is a separate, evidence-driven change.

### Why this removes the risk

At `designWidth = 1024` every formula above must reproduce today's literal exactly.
That is a free, exact regression test — **write it first**, before changing any
consumer:

> For each tileScale, `getSeatRegions(tileScale, 1024)` deep-equals the current static
> table, and `getWallSegmentRegion(1024)` deep-equals today's `WALL_SEGMENT_REGION`.

Snapshot the current tables before editing so this is checkable. If that test passes,
the budget fight is provably untouched and extra width can only ever become empty table
surface in the middle — which is what a physical table looks like.

## Plumbing decision: extend the existing context

Extend `StageScaleContext` to carry `{ scale, designWidth }` and rename it to
`StageMetricsContext`. Do **not** prop-drill `designWidth`, and do not add a second
context.

Rationale: `designWidth` has the same producer (`GameStage.tsx`'s `ResizeObserver`
callback), the same consumer path, and the same lifetime as `scale`. A parallel
mechanism for an identically-travelling value is pure cost. This also avoids changing
`Seat.tsx`'s props signature.

Keep `getSeatRegions(tileScale, designWidth)` a **pure function** — no context reads
inside it — so the three call sites in `stageLayout.test.ts` stay trivial.

`STAGE_WIDTH` becomes `MIN_DESIGN_WIDTH` (1024) and is no longer the live value.
Compute the live `designWidth` in the same `ResizeObserver` callback that already
computes `scale`, and publish both through the context. `GameStage.tsx:60`'s inline
`width:` style reads the live value.

## Performance: quantise and memoise

`ResizeObserver` fires continuously; `getSeatRegions` rebuilds four object tables per
seat per event.

- **Quantise `designWidth` to 8 design px** before it reaches `getSeatRegions` *or* the
  stage transform — both must use the same quantised value, or regions will drift out
  of alignment with the rendered stage.
- **Memoise `getSeatRegions` on `(tileScale, designWidth)`.**

Tradeoff, accepted deliberately: board width snaps in 8-design-px steps while dragging
the window. Imperceptible in motion, and it makes Playwright measurements reproducible
instead of dependent on exact window size. If the snap turns out to be visible, try 4
before abandoning quantisation.

## Tests — supersedes/extends 2.3

Write in this order:

1. **Parity at the low end (write first, before any edits).** As above:
   `getSeatRegions(tileScale, 1024)` deep-equals the snapshotted current tables, all
   three scales. Same for the wall region.
2. **Property test across the range.** For `designWidth` in `[1024..1920]` step 8, for
   each tileScale:
   - no two regions within a seat overlap
   - every region lies within `[0, designWidth]`
   - no seat region collides with the wall segment region
   - centred regions are centred to within 1px; right-anchored regions preserve their
     original right margin exactly
3. Then the four assertions already listed in Phase 2 §2.3 (one-row hand; all group
   fit-scales exactly 1.0 on desktop; tile width monotonic across
   normal→large→xlarge; `designWidth × scale` ≈ available width at ≥16:9).

## Confirmed from the audit — no further investigation needed

- All y-coordinates and heights: unchanged, `DESIGN_HEIGHT` stays 768.
- Offset-1 `x:8`: genuine left margin, independent of `designWidth`.
- `TableSurface.tsx` (`inset-0`/`inset-[14px]`): automatically correct.
- `WallSegment.tsx` internal tile math: correct once the region producer is fixed.
  Only its import changes — static const ⇒ `getWallSegmentRegion(designWidth)`.
- Drop-zone sentinel does consume a full tile slot (`HandTiles.tsx:154` passes real
  `tileWidth`/`tileHeight` for `order.length + 1`). Reclaiming it is in scope per
  Phase 2 §2.2.

## Revised work order

1. Snapshot current seat + wall tables; write test 1 (parity at 1024). It must pass
   against **unchanged** code first (trivially), then still pass after the refactor.
2. Convert `WALL_SEGMENT_REGION` ⇒ `getWallSegmentRegion(designWidth)`; update
   `WallSegment.tsx`. Smallest possible slice — verify test 1 still green.
3. Convert the three `SEAT_REGIONS_*` tables to the anchor policy above; add
   `designWidth` param to `getSeatRegions`; update the 3 test call sites.
4. Extend context to `{ scale, designWidth }`; compute quantised `designWidth` in
   `GameStage.tsx`; update `Seat.tsx:71` to read from context.
5. Add memoisation. Add test 2 (property test across range).
6. **Stop and report measured tile widths** at the 1910/1440/1280 × 3-scale matrix
   before touching Phase 2 §2.2 (wrap elimination). §2.1 alone may already unwrap
   `large`, which changes what §2.2 needs to do.

Constraints from Phase 2 unchanged: stable tile IDs, no auto-sorting, no changes to fan
detection / win validation / hint logic / game state, no third `transform: scale()`.
