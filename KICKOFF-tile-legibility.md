# Kickoff: Tile legibility & board layout overhaul

## Goal

The trainer is functionally working but **visually unusable**. Fix tile legibility and
board sizing. This session is UI/rendering only — do not change game logic, fan
detection, or state management.

Treat this as a blocking usability defect, not a polish task.

---

## Symptoms (measured from a 1910px-wide desktop screenshot)

1. **Board is roughly half the window width.** The green table spans ~980px inside a
   1910px viewport. ~930px of the window is empty black. The table does not grow with
   the window.

2. **Hand tiles are too small.** ~57px wide × ~88px tall. A comparable commercial web
   mahjong client uses ~87px wide at the same window size — mine are ~65% the linear
   size, ~42% the area.

3. **The 14-tile hand wraps onto two rows** (11 tiles + 3 tiles). This is the worst of
   the three problems. A hand row that reflows destroys positional memory between turns
   and makes the hand unreadable at a glance.

4. **Tile faces are mostly empty space and low contrast.** The glyph occupies roughly
   40% of the tile face. The rank indicator in the corner is very small. Four character
   tiles (一萬 / 二萬 / 六萬 / 八萬) in the same hand are hard to tell apart without
   deliberately focusing on each one.

*Measurements are approximate, taken off a screenshot. Verify the real values in code
and in the browser before acting on them.*

---

## Phase 1 — Diagnose before changing anything

Report findings back to me before writing code.

1. **Identify the rendering approach.** Are tiles DOM elements with text glyphs, an
   HTML canvas, SVG, or `<img>` assets? Tell me which file owns tile rendering.

2. **Find the width cap.** Locate whatever constrains the table container to ~980px —
   a `max-width`, a fixed px width, a fixed aspect-ratio box, or a hardcoded canvas
   size. Give me file and line.

3. **Search for `scale(`, `zoom`, and `transform:` on any ancestor of the table.**
   A non-integer `transform: scale()` used to "fit the table to the viewport" blurs
   text, borders and box-shadows on every descendant. This is the most likely cause
   of any genuine softness. Report what you find, including the computed scale factor
   at a typical viewport size.

4. **If tiles are canvas-rendered**, check whether the canvas backing store is scaled
   by `window.devicePixelRatio`. If it isn't, that is the crispness bug outright, and
   it will look far worse on the iPad than on desktop.

5. **Find where tile pixel dimensions are defined.** Are they hardcoded px, or derived
   from container size? List every place a tile dimension is set.

6. **Find the hand container's flex/grid config** and confirm what allows it to wrap.

---

## Phase 2 — Fixes, in this order

Do these one at a time. After each, tell me what changed and let me look before moving on.

### 2.1 Make the board fluid

- Remove the fixed width cap. The table should fill the available viewport width,
  minus a small margin, up to a sensible ceiling (not ~980px).
- Preserve the table's aspect ratio if the layout depends on it, but drive the size
  from the viewport rather than a constant.
- Height must also be respected: on a short window the table should be bounded by
  height, not overflow. Use `min()` of a width-derived and a height-derived size.

**Acceptance:** at 1910px wide the green table occupies the large majority of the
window width. Resizing the window resizes the table continuously with no layout jumps.

### 2.2 Make the hand physically unable to wrap

- `flex-wrap: nowrap` on the hand row.
- Derive tile width from available space so 14 tiles plus the drawn tile plus gaps
  always fit on one line. Something along the lines of:
  `width: min(<comfortable-max>, calc((100% - <total-gap>) / 15))`
- The drawn/newly-picked tile should stay visually separated from the 13 concealed
  tiles without being pushed to a second row.

**Acceptance:** the hand never occupies more than one row at any viewport width down
to iPad portrait. Verify by resizing continuously, not by checking two fixed sizes.

### 2.3 Replace hand-drawn tile faces with a real vector tile set

This is the highest-leverage change. Hand-rolled CSS/text tiles will not reach
acceptable legibility no matter how much they are tuned.

- Use a permissively licensed SVG tile set. Candidates, both widely used:
  - `https://codeberg.org/davidgomez/libreriichi-assets` — CC0 1.0
  - `https://github.com/FluffyStuff/riichi-mahjong-tiles` — vector, regular + black variants
- **Check the licence text in the repo yourself and record it** in a
  `src/assets/tiles/LICENCE.md` alongside the files. Do not rely on my summary.
- These are riichi sets. MCR uses the same 34 tile faces for the suits, honours and
  dragons, so coverage is fine, but **confirm every one of the 34 faces the game needs
  has a corresponding asset** before ripping out the old renderer. Flag any gaps
  (e.g. flowers/seasons if the trainer uses them) rather than silently substituting.
- Prefer inline SVG sprite or individual SVG files over a raster sprite sheet — SVG
  stays crisp on iPad retina with no `@2x` asset management.
- Keep the tile *frame* (border, corner radius, shadow, selected/highlight state) as
  CSS on the wrapper. Only the tile *face* comes from the asset. This keeps hover,
  selection and the existing highlight styling intact.

**Acceptance:** tiles are legible at a glance; the rank of a character tile is
identifiable without focusing on it. Zooming the browser to 200% shows no softening.

### 2.4 Only if 2.1–2.3 leave a legibility gap

- Add a large, high-contrast Arabic numeral in the tile corner as a rank indicator,
  in addition to the tile face. Many players read the numeral, not the glyph.
- Consider a subtle per-suit background tint to help suit separation.
- Treat both as opt-in via Settings rather than forced, since they deviate from
  physical tile appearance.

---

## Hard constraints — do not violate

- **Stable unique tile IDs must be preserved.** Nothing in this work should change how
  tiles are identified. See `CLAUDE.md`.
- **No auto-sorting of the hand.** User-controlled ordering stays as-is.
- **Do not touch** fan detection, win validation, shanten/hint logic, or game state.
  If a fix appears to require changes there, stop and ask me.
- **Do not "fix" crispness with a global `transform: scale()`.** If one already exists,
  removing it is likely part of the fix, not adding another.
- Keep the existing Settings, Hint, Tile counts and other toolbar functionality working.

---

## Verification before you call this done

1. Desktop Chrome at 1910px, 1440px, and 1100px wide — screenshot each. Confirm the
   hand is one row and the table fills the width at all three.
2. Resize the window continuously through that range and confirm no wrap, no overflow,
   no layout jump.
3. Browser zoom at 200% — confirm tile faces stay sharp.
4. **iPad Safari over the Vite `--host` dev server**, both landscape and portrait.
   Confirm: hand does not wrap, tiles are sharp on retina, safe-area insets are
   respected, and tile tap targets are still reliably hittable at the new size.
   Use Eruda if anything needs debugging on-device.
5. Run the existing test suite and confirm nothing regressed.
6. Report anything you changed that you were not confident about.

---

## Notes for me (Kevin) — not for Claude Code

- My instinct was that this was a "crispness" problem. On re-measuring, the tiles are
  reasonably crisp; they are small, low-contrast, and wrapping. Phase 2.1–2.3 addresses
  the real causes. Phase 1.3 / 1.4 will confirm whether there is *also* a true
  blurriness bug from a `scale()` transform or a missing devicePixelRatio.
- If Phase 1 reveals the board width is baked into a canvas size or an
  aspect-ratio-locked layout, 2.1 may be a larger refactor than it looks. Get the
  diagnosis before budgeting the session.
