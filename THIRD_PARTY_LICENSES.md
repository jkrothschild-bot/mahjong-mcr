# Third-party assets

## Tile face art

The 34 standard tile-face images (`packages/ui/src/tiles/assets/*.svg`) are
generated from PNG exports of:

- **Project:** [FluffyStuff/riichi-mahjong-tiles](https://github.com/FluffyStuff/riichi-mahjong-tiles)
- **License:** CC0 1.0 / public domain
- **Vendored copy + commit pin:** `packages/ui/src/tiles/vendor/riichi-mahjong-tiles/`

The generator (`packages/ui/scripts/generate-tile-art.mjs`) composites each
upstream glyph with a tile-shaped background and a baked-in numeral/letter
badge; see that script and `tiles/vendor/riichi-mahjong-tiles/NOTICE.md` for
details and re-sync instructions.

This upstream set has no flower/season tiles. Those 8 tile types (`F1`-`F4`,
`S1`-`S4`) use an original, coded SVG (`packages/ui/src/tiles/FlowerTileFace.tsx`),
not a third-party asset.

`packages/ui/src/tiles/assets/bot-back.png` (the concealed-hand tile back) is
unrelated to this vendoring — it wasn't touched by this swap, and its
origin/license is still undocumented (same pre-existing gap the 34 tile
faces used to have). Also unaddressed: `docs/Mockups/assets/*.png` and
`docs/Mockups/index.html`, an older standalone mockup (not the v6 baseline)
that references its own separate, equally-undocumented copies of tile PNGs.
