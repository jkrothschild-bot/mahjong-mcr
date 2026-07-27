# Mahjong Mentor visual and UX specification — v6

## Tile-face artwork
- Arabic suit numbers and Latin wind letters are printed **inside the ivory face artwork**. They must never be separate tabs, badges, HTML overlays or neighbouring labels.
- Indices are small secondary markings: red for Characters, blue for Circles, green for Bamboo, and red Latin letters for winds.
- Traditional symbols remain visually dominant and are never moved to make room for a badge.
- Render face assets at high resolution and scale down only. Do not enlarge small raster assets or apply perspective transforms to the face layer.

## Discard rivers
- Every discard occupies a fixed grid cell with visible horizontal and vertical clearance.
- Tiles must never overlap, fan, cascade or sit on top of one another.
- Each river uses six columns and grows to a new row after six discards.
- Rotating an opponent river must rotate the complete grid, not independently offset its tiles.

## Wall versus concealed hands
- The live wall uses pale jade backs and is always shown as clearly visible two-tile-high stacks.
- The lower wall tile is vertically exposed beneath the upper tile; do not fake a stack using a diagonal sideways offset.
- Concealed bot hands use deep midnight-blue backs with brass line work and sit in a separate rack area closer to each player edge.
- Maintain at least 20–25 px of visual separation between a bot hand and the nearest wall.

## Strategy coach
- The coach occupies a dedicated right-hand column and never overlays or reduces the physical table surface.
- It includes three tabs: Best move, Hand plan and Tile safety.
- Best move includes the recommended tile image, concise recommendation, numbered reasons, route to eight points, alternatives with confidence scores, and actions.
- Hand plan explains current structure, primary route and events that would change the plan.
- Tile safety shows visible-copy evidence and defensive reasoning.
- The panel may scroll internally, but the table remains fixed and unobstructed.

## Table geometry
- Preserve the seated first-person view, visible front apron, deep wood rails and inset felt.
- Player tiles remain upright and crisp; depth comes from the table, tile bodies, shadows and scale—not from blurring or skewing tile faces.
