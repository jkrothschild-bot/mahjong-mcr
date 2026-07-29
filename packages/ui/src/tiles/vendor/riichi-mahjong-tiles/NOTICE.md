# Vendored: FluffyStuff/riichi-mahjong-tiles

Source: https://github.com/FluffyStuff/riichi-mahjong-tiles
Commit: see `COMMIT.txt` (fetched 2026-07-29)
License: CC0 / public domain — see `LICENSE.md` (copied verbatim from upstream)

`Export/Regular/*.png` are the upstream 600x800 PNG exports, unmodified,
kept here as the raw input to `packages/ui/scripts/generate-tile-art.mjs`.
That script composites each glyph into `packages/ui/src/tiles/assets/*.svg`
— a tile-shaped background plus a baked-in arabic numeral/wind-dragon-letter
badge, per CLAUDE.md's requirement that badges be part of the artwork itself
rather than a runtime overlay. The generated `.svg` files are what the app
actually renders; these upstream PNGs are provenance + regeneration input,
not directly imported anywhere.

This set has no flower/season tiles — those still use the coded SVG
stand-in (`FlowerTileFace.tsx`), unchanged by this vendoring.

To re-sync after an upstream update: replace the files under `Export/Regular/`
with the new export, update `COMMIT.txt`, and re-run the generator script.
