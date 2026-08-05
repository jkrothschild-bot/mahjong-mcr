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

## Flower/season tile art

The upstream set above has no flower/season tiles. The 8 flower/season tile
faces (`flower1-art.png`-`flower4-art.png`, `season1-art.png`-
`season4-art.png`) are original project artwork generated with OpenAI's image
generation tool specifically for this game, not vendored or adapted from an
external asset set. They depict plum, orchid, chrysanthemum and bamboo, plus
spring peony, summer lotus, autumn maple and winter pine. There is no
third-party source to attribute.

`packages/ui/src/tiles/FlowerTileFace.tsx` (a coded stand-in, also original
artwork) is kept only as a fallback for a missing/misnamed asset — normal
rendering uses the finished PNG artwork above.

`packages/ui/src/tiles/assets/bot-back.png` (the concealed-hand tile back) is
unrelated to this vendoring — it wasn't touched by this swap, and its
origin/license is still undocumented (same pre-existing gap the 34 tile
faces used to have). Also unaddressed: `docs/Mockups/assets/*.png` and
`docs/Mockups/index.html`, an older standalone mockup (not the v6 baseline)
that references its own separate, equally-undocumented copies of tile PNGs.
