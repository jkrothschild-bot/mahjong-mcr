# Codex Implementation Spec — Authentic MCR Wall and Dealing Visualisation

## Objective

Implement a visually authentic Mahjong Competition Rules (MCR) wall and dealing sequence in the existing Mahjong application.

The player should be able to see:

- the complete physical wall at the beginning of a hand;
- the correct number of tiles and stacks;
- tiles visibly being dealt from the wall to each player;
- the wall physically depleting as play continues;
- normal tiles being drawn from the front of the wall;
- Flower and Kong replacement tiles being drawn from the back of the wall.

This is primarily a **wall-state visualisation and animation feature**.

Do not change scoring, fan detection, bot strategy, claim rules, or hand-validity logic except where a narrowly scoped state change is genuinely required to expose already-correct wall information to the UI.

---

# 1. RULE AUTHORITY — READ BEFORE CODING

Do not implement Mahjong wall behaviour from memory or from generic Mahjong conventions.

Before making changes, inspect:

`docs/rules/README.md`

`docs/rules/mcr_EN.pdf`

`docs/rules/decisions.md`

In particular, review the decisions concerning:

- the absence of a fixed dead wall;
- the 144-tile wall;
- front-end versus back-end draws;
- Kong replacement draws;
- Flower replacement draws;
- the existing two-pointer wall model;
- the Phase 8 wall-rendering convention.

The official rules source for this project is:

**World Mahjong Organization — Mahjong Competition Rules, 2006 (`mcr_EN.pdf`)**

Where this specification and the official rulebook conflict, the official rulebook takes precedence.

If implementation uncovers a rules ambiguity, do not silently invent behaviour. Document the ambiguity consistently with the existing approach in `docs/rules/decisions.md`.

---

# 2. IMPORTANT CORRECTIONS TO ANY EARLIER WALL SPECIFICATION

Do not use any previous specification which described:

- a 136-tile MCR wall;
- 17 stacks per side;
- a fixed 14-tile dead wall;
- Kong replacement tiles coming from a separate dead-wall reserve;
- Flowers/Seasons as absent from MCR.

Those assumptions are incorrect for this project.

The correct MCR wall contains:

**144 physical tiles**

comprising:

- 108 suited tiles;
- 28 Honor tiles;
- 8 Flower/Season bonus tiles.

The wall must therefore visually represent all **144 tiles** at the beginning of a hand.

---

# 3. PHYSICAL WALL STRUCTURE

A physical MCR wall is built from four sides.

Each player builds:

**18 stacks**

with:

**2 tiles per stack**

Therefore each side contains:

**18 × 2 = 36 tiles**

and the complete wall contains:

**4 × 36 = 144 tiles**

Required initial visual structure:

- East side: 18 two-high stacks = 36 tiles
- South side: 18 two-high stacks = 36 tiles
- West side: 18 two-high stacks = 36 tiles
- North side: 18 two-high stacks = 36 tiles

Total:

**72 physical stacks**

**144 physical tiles**

This is not merely decorative.

The wall visualisation must correspond to actual wall consumption.

Do not display a shortened decorative wall while maintaining the real count somewhere else.

---

# 4. WALL SHAPE ON THE TABLE

Render the four sides around the central discard/play area so that the table looks recognisably like a physical Mahjong table.

Conceptually:

```text
                NORTH WALL
            18 stacks × 2 high


 WEST WALL                       EAST WALL
 18 × 2                           18 × 2


                SOUTH WALL
            18 stacks × 2 high
```

Exact screen orientation should follow the application's existing seat/layout convention.

Do not arbitrarily change existing seat orientation.

---

# 5. EXISTING ENGINE WALL STATE MUST REMAIN AUTHORITATIVE

Before implementing UI behaviour, inspect the existing engine implementation.

In particular inspect:

`packages/engine/src/wall.ts`

and all relevant:

- hand initialization;
- deal logic;
- draw logic;
- Kong replacement logic;
- Flower replacement logic;
- persistence/replay logic;
- game-state serialization.

The repository's existing rules decisions indicate that the engine uses a two-ended/two-pointer wall model.

Preserve that architecture unless there is compelling evidence that it is incorrect.

The required relationship is:

**engine wall state → visual wall**

NOT:

**engine wall state + independent simulated UI wall**

There must never be two independently advancing versions of the wall.

---

# 6. FRONT AND BACK OF THE WALL

MCR uses a single wall.

There is **no fixed 14-tile dead wall reserve**.

The wall must instead support two consumption directions.

## Front of wall

Used for:

- initial deal;
- ordinary turn draws.

## Back of wall

Used for:

- Flower replacement tiles;
- Kong replacement tiles.

This should correspond to the existing two-pointer wall architecture documented in `docs/rules/decisions.md`.

Conceptually:

```text
NORMAL DRAW DIRECTION
        ↓

FRONT ===================================== BACK
                                             ↑
                                  FLOWER / KONG
                                  REPLACEMENTS
```

Both ends consume tiles from the same finite physical 144-tile wall.

Eventually the two consumption points can meet.

That represents wall exhaustion.

Do not reserve or visually mark 14 tiles as permanently unavailable.

---

# 7. NO "DEAD WALL" UI

Do not introduce a Riichi-style or other Mahjong-variant-style fixed dead wall.

Specifically do not:

- reserve 14 tiles;
- draw a divider 14 tiles from the end;
- label a section "Dead Wall";
- prevent ordinary play from ultimately consuming all remaining tiles;
- treat Kong replacement tiles as belonging to a separate 14-tile pool.

That behaviour would contradict the MCR rules used by this project.

The UI may visually communicate the **back end** of the wall when a replacement tile is drawn, but it should not imply the existence of a separate dead wall.

---

# 8. WALL BREAK

The official MCR rules define a physical wall-breaking procedure involving dice and a break location.

However, the existing engine currently does not model physical dice and wall-breaking in the same way a real tabletop game does.

`docs/rules/decisions.md` already documents the existing Phase 8 rendering convention around this.

For this implementation:

## Do not casually introduce a new dice/randomisation system.

First inspect:

- how the shuffled wall is generated;
- whether any wall-break metadata already exists;
- how the Phase 8 wall renderer currently anchors its break;
- how saved games/replays reproduce wall order.

The visible wall must have a clear starting/break position so that players can see where dealing begins.

### Important architectural constraint

The visual break must never change which tiles players actually receive unless the engine is intentionally redesigned to model an authentic physical break.

Do not create a second random UI-only wall break that can disagree with the actual wall order.

### For this feature

If the engine still uses the documented dealer-anchored rendering convention, preserve that convention rather than adding dice mechanics as hidden scope.

Document clearly in code/comments that:

- the wall layout and consumption are rule-authentic;
- the exact visual break selection is currently an application rendering convention;
- full physical dice-based break simulation can be considered separately.

Do not add a dice-rolling feature as part of this task unless existing architecture already supports it.

---

# 9. INITIAL DEAL — MUST BE VISUALLY REPRESENTED

Do not simply begin the hand with all players' tiles already present.

For a new hand, the player should briefly see the complete wall before dealing begins.

Then visibly deal tiles from the front of the wall.

The official dealing structure should be represented.

The dealer is East.

The deal proceeds around the players in order using groups of four tiles.

Conceptually:

### Pass 1

- East receives 4
- South receives 4
- West receives 4
- North receives 4

### Pass 2

- East receives 4
- South receives 4
- West receives 4
- North receives 4

### Pass 3

- East receives 4
- South receives 4
- West receives 4
- North receives 4

At this stage every player has:

**12 tiles**

The final deal then results in:

- East: 14 tiles
- South: 13 tiles
- West: 13 tiles
- North: 13 tiles

Total initially dealt:

**53 tiles**

The animation should reflect the physical MCR dealing process sufficiently closely that a learner can understand what is happening.

---

# 10. EAST'S FINAL TWO TILES

Check the exact dealing procedure in `mcr_EN.pdf §3.5.7` before implementing this part.

The physical dealing convention for East's final two tiles should be represented correctly rather than treating them as an arbitrary normal two-tile draw.

The official procedure involves East taking the appropriate separated top tiles from the wall before the other players take their final single tile.

Implement the visual removal pattern according to the rulebook.

Do not guess stack positions.

Add a focused test for this mapping if the visual wall models individual top/bottom stack positions.

---

# 11. TOP AND BOTTOM TILES MATTER

Because the physical wall consists of two-high stacks, the renderer should model whether each remaining physical tile is:

- top tile;
- bottom tile.

When dealing/removing tiles, the wall should visually lose the correct physical tile positions.

For example, removing two complete stacks should visually remove four tiles rather than simply shortening an abstract progress bar.

The representation should remain internally consistent even where the official deal selects non-adjacent top tiles.

---

# 12. FLOWERS AND SEASONS

The complete MCR set contains **8 Flower/Season tiles**.

These are part of the 144-tile wall.

They must therefore exist physically in the visual wall before being drawn.

When a Flower/Season tile is received:

1. the Flower is exposed according to the existing game behaviour;
2. it no longer counts as a concealed playing tile in the player's normal hand;
3. a replacement tile is drawn from the **back end of the wall**;
4. if a replacement is itself another Flower, replacement continues according to the rules.

This applies both:

- during initial hand setup;
- during later play.

Do not simply delete Flower tiles and manufacture replacement tiles.

Each replacement must visibly consume a real tile from the back of the same wall.

---

# 13. FLOWER REPLACEMENT AFTER INITIAL DEAL

After the initial tiles have been distributed, the rules specify Flower replacement.

The visualisation should make this understandable.

Suggested sequence:

1. complete the primary 53-tile deal;
2. reveal any Flower tiles according to game state;
3. visibly draw required replacements from the back end;
4. continue replacements if another Flower is drawn;
5. finish hand setup;
6. commence normal play.

Do not allow the animation layer to determine whether a tile is a Flower.

The engine state remains authoritative.

---

# 14. NORMAL TURN DRAW

During normal play:

1. identify the next tile from the engine's front pointer;
2. remove that physical tile from the visible wall;
3. animate it toward the active player's hand;
4. expose its face only where existing information-visibility rules allow it.

A normal draw must reduce the available wall by exactly one physical tile.

The wall should visibly progress from the original break/draw point.

---

# 15. KONG REPLACEMENT DRAW

After a valid Kong requiring a replacement tile:

1. use the engine's existing Kong logic;
2. identify the physical tile consumed by the back pointer;
3. remove that tile from the back end of the visible wall;
4. animate it toward the appropriate player.

Do not draw the replacement from the front.

Do not draw it from a separate dead wall.

Do not have the UI determine whether the Kong qualifies for a replacement.

The engine must remain authoritative.

---

# 16. WALL EXHAUSTION

The game reaches wall exhaustion when the available front and back portions have been completely consumed according to the existing engine model.

The visible wall should reflect this exactly.

If there are:

`N`

physical tiles remaining according to the engine, the visual wall should display exactly:

`N`

remaining physical tiles.

Do not maintain an artificial reserve.

---

# 17. INFORMATION SECURITY / HIDDEN TILES

The new animations must not expose concealed information.

Wall tiles are always face-down.

For the human player's draw:

- show the tile according to existing UI behaviour.

For bot/opponent draws:

- do not reveal the tile face unless existing game rules/UI already expose it.

Animations must work with tile identity internally without visually leaking that identity.

No:

- tile IDs;
- physical instance numbers;
- internal array indexes;
- debugging identifiers

should appear in production UI.

---

# 18. PLAYER HANDS DURING INITIAL DEAL

The human player's tiles may become visible as they are dealt.

Opponent hands should remain concealed.

For opponents, the player should see face-down tiles accumulate so that the physical dealing process is understandable without exposing tile identities.

Example:

```text
East      ■■■■■■■■■■■■■■

South     ▬▬▬▬▬▬▬▬▬▬▬▬▬

West      ▬▬▬▬▬▬▬▬▬▬▬▬▬

North     ▬▬▬▬▬▬▬▬▬▬▬▬▬
```

Use the application's existing orientation and tile styling rather than introducing an unrelated visual design.

---

# 19. ANIMATION STYLE

Animation should improve understanding without making gameplay tedious.

## Initial deal

Use visually recognisable groups of four.

It is not necessary to slowly animate all 53 tiles individually one at a time.

A good compromise is:

- visibly remove four physical tiles;
- animate the group toward a player;
- quickly continue to the next player.

The final individual tiles should be animated separately where the physical deal differs from the four-tile groups.

## Normal draw

One brief animation.

## Flower replacement

One brief animation from the opposite/back end.

## Kong replacement

One brief animation from the opposite/back end.

Animation should be fast and restrained.

---

# 20. ANIMATION MUST NOT CONTROL GAME RULES

Do not make game correctness dependent on CSS/animation timing.

Prefer the architecture:

```text
Game state changes
        ↓
Wall visualisation receives transition
        ↓
Animation represents the transition
        ↓
UI settles into authoritative game state
```

rather than:

```text
Animation removes a tile
        ↓
Animation decides what tile was drawn
        ↓
Engine updates afterward
```

The animation is a representation of game state, not the game engine itself.

---

# 21. ANIMATION INTERRUPTION

Consider these cases:

- page refresh during animation;
- route change;
- saved game load;
- user leaving the game;
- React component remount;
- reduced-motion accessibility preference.

The game must recover directly to the correct authoritative state.

It must never become stuck because an animation did not finish.

---

# 22. NEW HAND VS RESUMED HAND

## New hand

Show:

1. complete wall;
2. initial dealing animation;
3. Flower replacements where applicable;
4. start of normal play.

## Resumed hand

Do **not** replay the initial dealing animation.

Immediately reconstruct:

- current wall depletion;
- current front position;
- current back position;
- player hands;
- Flowers;
- melds;
- discards.

The wall must look exactly as it should at that point in the hand.

---

# 23. PERSISTENCE

The visual wall must be reproducible from persisted authoritative game state.

Do not persist animation state unless genuinely required.

Prefer persisting/reconstructing:

- wall tile order where already persisted;
- front pointer;
- back pointer;
- relevant hand state;
- dealer;
- any existing wall-layout metadata.

A saved game must not produce a different visual wall after reload.

---

# 24. RESPONSIVE LAYOUT

The physical 144-tile wall contains a substantial number of visual elements.

It must therefore scale intelligently.

The wall must not obscure:

- player hands;
- discards;
- melds;
- action buttons;
- scoring information;
- hints;
- tile-count information;
- navigation controls.

On smaller screens, acceptable adaptations include:

- narrower tile backs;
- shorter tile height;
- tighter stack spacing;
- reduced perspective;
- simplified shadows/depth.

Do not reduce the logical number of wall tiles to make the design fit.

The visual wall still represents every remaining physical tile.

---

# 25. PERFORMANCE

Avoid creating unnecessary rendering overhead from 144 individually complex React components if a simpler representation performs better.

However, optimisation must not sacrifice the ability to represent individual physical tile positions correctly.

Evaluate:

- CSS layout;
- lightweight tile-back components;
- memoisation;
- grouped wall-side rendering;
- animation transforms rather than expensive layout changes.

Do not prematurely rewrite unrelated UI infrastructure.

---

# 26. EXISTING PHASE 8 WALL WORK

Before creating new wall components, inspect the repository for existing Phase 8 wall rendering work.

Search for:

- `Wall`
- `MahjongWall`
- wall rendering components
- wall position helpers
- front/back pointers
- dealer anchoring
- tile-position mapping
- Phase 8 comments/tests

Reuse correct existing work.

Do not build a second wall implementation in parallel because the earlier implementation was overlooked.

If Phase 8 already solves some of this specification, extend/refactor it rather than replacing it unnecessarily.

---

# 27. REQUIRED PRE-IMPLEMENTATION INSPECTION

Before editing code, identify and report in the implementation summary:

1. Where the canonical shuffled wall is stored.
2. How the initial 53 tiles are currently dealt.
3. How Flowers are currently handled during the deal.
4. How normal draws advance.
5. How the back pointer advances.
6. How Kong replacement draws work.
7. How Flower replacement draws work.
8. How wall exhaustion is detected.
9. How wall state is saved/restored.
10. What existing Phase 8 visual-wall code exists.
11. Whether the application currently stores an authentic physical wall break or uses only the documented rendering convention.
12. Which existing component should own the new wall visualisation.

Do not change code simply because the UI differs from a real tabletop layout until you have determined whether the difference is:

- an engine-rule issue;
- a rendering-only issue;
- an intentional documented convention.

---

# 28. SUGGESTED COMPONENT ARCHITECTURE

Follow existing project conventions, but a reasonable structure may be:

```text
MahjongWall
 ├── WallSide
 │    ├── TileStack
 │    │    ├── top tile
 │    │    └── bottom tile
 │
 ├── wall-position mapping
 ├── front draw position
 └── back draw position
```

Potential helper responsibilities:

```text
mapWallIndexToPhysicalPosition()
getVisibleWallState()
getFrontDrawPosition()
getBackDrawPosition()
```

Names are illustrative only.

Do not introduce unnecessary abstraction if the existing code already provides these concepts.

---

# 29. PHYSICAL POSITION MAPPING

A key implementation requirement is mapping the engine's linear wall representation onto the four physical sides.

The mapping must be deterministic.

Given the same:

- wall;
- dealer;
- wall-break convention/metadata;
- front pointer;
- back pointer;

the application must always produce the same physical layout.

The mapping must correctly cross wall-side boundaries.

Example conceptually:

```text
side 1 → 36 tiles
side 2 → 36 tiles
side 3 → 36 tiles
side 4 → 36 tiles
```

but the actual draw sequence begins at the wall break, not necessarily at visual tile zero.

Do not assume:

`tiles[0] = first tile on South wall`

unless that is explicitly how the current engine/rendering convention defines it.

---

# 30. STACK-LEVEL STATE

Because the wall is two tiles high, a stack may visually be:

- both tiles present;
- top tile removed, bottom remains;
- bottom/top status altered by a special dealing pattern;
- completely empty.

The component model must support partial stacks.

Do not model only whole stacks as present/absent.

This is necessary to represent the real deal correctly.

---

# 31. EXISTING REMAINING-TILE COUNTER

Do not automatically remove the existing numeric "tiles remaining" information.

The physical wall provides intuitive information.

The numeric counter provides precise information.

They can complement each other.

Only remove or relocate existing information if required to avoid clutter, and keep such UI changes minimal.

---

# 32. LEARNING VALUE

This application is intended to help people learn Mahjong.

The wall should therefore be understandable rather than merely decorative.

A beginner should gradually be able to understand:

- Mahjong starts with a physical wall;
- there are 144 tiles in MCR;
- the wall is two tiles high;
- dealing actually consumes tiles from the wall;
- players normally draw from one end;
- Flowers and Kongs cause replacement draws from the opposite end;
- the wall eventually runs out.

Do not add large instructional popups as part of this feature.

The physical behaviour itself should teach the concept.

---

# 33. TEST REQUIREMENTS

Add targeted automated tests.

Do not rely only on screenshot/manual testing.

## A. Initial wall

Verify:

- exactly 144 physical tiles;
- exactly four sides;
- exactly 36 tiles per side;
- exactly 18 stacks per side;
- exactly two tiles per full stack.

## B. Initial deal

Verify the primary deal consumes exactly:

**53 tiles**

before any Flower replacement draws.

Verify final concealed/non-Flower hand counts according to existing game-state semantics:

- East/dealer begins play with the appropriate 14-tile state;
- South has 13;
- West has 13;
- North has 13;

subject to existing Flower representation/replacement handling.

## C. Four-tile deal groups

Verify the first three dealing passes distribute groups of four in the correct seat order.

## D. Dealer final tiles

Add a regression test ensuring East's final physical tile removals follow the rulebook dealing pattern rather than an arbitrary sequential visual shortcut.

## E. Flower replacement

Verify:

- Flower belongs to the original 144-tile wall;
- Flower replacement consumes a tile from the back pointer;
- front pointer is not incorrectly advanced;
- repeated Flower replacement consumes additional back tiles correctly.

## F. Normal draw

Verify:

- exactly one tile is consumed;
- front pointer advances;
- back pointer does not advance;
- physical wall state loses the corresponding tile.

## G. Kong replacement

Verify:

- exactly one replacement tile is consumed;
- back pointer advances;
- front pointer does not advance;
- physical wall loses the corresponding back-end tile.

## H. No dead wall

Add a regression test protecting against reintroduction of a fixed 14-tile reserve.

The wall must be capable of being depleted according to the existing two-pointer engine model.

## I. Physical mapping

Verify boundary transitions between wall sides.

Examples:

- last physical location on one side;
- next physical location on adjacent side;
- depletion across a corner;
- back-end depletion across a corner.

## J. Partial stacks

Verify wall rendering correctly represents:

- full stack;
- one remaining tile;
- empty stack.

## K. Resume

Verify loading a saved in-progress hand reconstructs:

- same remaining-tile count;
- same front position;
- same back position;
- same physical wall depletion.

Initial deal animation must not replay.

---

# 34. REGRESSION PROTECTION

All existing test suites must continue to pass.

In particular, this task must not change expected behaviour for:

- scoring;
- fan detection;
- shanten;
- hints;
- bot decisions;
- Chow/Pung/Kong/Hu claims;
- discard priority;
- hand validity;
- match progression;
- authentication;
- saved-game persistence.

If a pre-existing test fails because the current implementation itself contradicts `mcr_EN.pdf`, do not silently update the expected result.

Investigate and document the rule discrepancy first.

---

# 35. VISUAL ACCEPTANCE CRITERIA

The implementation is complete when all of the following are true:

- [ ] A new MCR hand visibly begins with 144 tiles.
- [ ] The wall has four physical sides.
- [ ] Each side contains 18 stacks.
- [ ] Each complete stack is two tiles high.
- [ ] The initial wall therefore contains 72 stacks / 144 tiles.
- [ ] The human player can visually see the wall before dealing starts.
- [ ] Initial tiles visibly originate from the wall.
- [ ] The three main dealing passes visibly distribute groups of four.
- [ ] The dealer's final physical deal follows the MCR procedure.
- [ ] East starts play with the correct tile count.
- [ ] South, West and North start with the correct tile counts.
- [ ] Flowers form part of the original physical wall.
- [ ] Flower replacements visibly consume tiles from the back of the wall.
- [ ] Normal draws visibly consume tiles from the front of the wall.
- [ ] Kong replacement draws visibly consume tiles from the back of the wall.
- [ ] There is no fixed 14-tile dead wall.
- [ ] Wall depletion matches authoritative engine state exactly.
- [ ] Partial two-high stacks can be represented correctly.
- [ ] Opponent concealed tiles remain hidden.
- [ ] Saved games restore the correct physical wall state.
- [ ] Initial dealing is not replayed when resuming a hand.
- [ ] Animations remain fast enough for normal gameplay.
- [ ] Existing scoring and gameplay tests remain green.
- [ ] New targeted wall/deal tests are green.

---

# 36. IMPLEMENTATION STAGES

Prefer incremental implementation rather than one large rewrite.

## Stage 1 — Audit and physical wall mapping

- inspect current Phase 8 implementation;
- confirm rule mappings;
- map the authoritative engine wall onto 72 physical stacks;
- render the correct current wall state;
- no major animation required yet.

Validate before proceeding.

## Stage 2 — Initial wall and dealing

- show complete wall before a new hand;
- animate four-tile dealing groups;
- correctly represent the dealer's final tiles;
- ensure opponent concealment.

Validate before proceeding.

## Stage 3 — Front/back live depletion

Animate:

- normal front draw;
- Flower back draw;
- Kong replacement back draw.

Validate front/back pointer correspondence carefully.

## Stage 4 — Resume and interruption handling

Ensure:

- reload;
- saved-game resume;
- route changes;
- animation interruption

always recover to authoritative state.

## Stage 5 — Visual polish

Only after correctness:

- spacing;
- scale;
- perspective;
- shadows;
- timing;
- responsive layout.

Do not mix visual-polish changes with unrelated engine refactoring.

---

# 37. MANUAL TEST SCENARIOS

After automated tests, manually test at least:

### Scenario 1 — Ordinary hand

Start a new game.

Confirm:

- complete 144-tile wall appears;
- correct four-sided 18×2 structure;
- visible dealing;
- normal draws progressively reduce the wall.

### Scenario 2 — Initial Flower

Use a deterministic fixture/seed where an initially dealt tile is a Flower.

Confirm:

- Flower comes from the normal dealing end;
- Flower is exposed;
- replacement visibly comes from back end;
- wall count remains consistent.

### Scenario 3 — Flower during play

Use fixture/seed where the active player draws a Flower.

Confirm normal draw occurs from front and replacement occurs from back.

### Scenario 4 — Kong

Create a Kong.

Confirm replacement visibly comes from the back.

### Scenario 5 — Multiple replacements

Test consecutive Flower/replacement behaviour where possible.

Confirm the back pointer advances correctly.

### Scenario 6 — Near wall exhaustion

Use deterministic state close to exhaustion.

Confirm front and back correctly approach one another and no hidden 14-tile reserve remains.

### Scenario 7 — Save/resume

Save during an established hand.

Reload.

Confirm exact wall state returns without replaying the deal.

---

# 38. DO NOT DO THE FOLLOWING

Do not:

- change the application to 136 tiles;
- omit the eight Flowers/Seasons;
- build 17 stacks per side;
- create a fixed 14-tile dead wall;
- copy Riichi dead-wall behaviour;
- draw Kong replacements from the front;
- draw Flower replacements from the front;
- maintain a separate fake UI wall;
- allow animations to determine game outcomes;
- expose opponent tile identities;
- add dice mechanics without first determining architectural implications;
- redesign scoring;
- redesign hints;
- redesign bots;
- redesign navigation;
- redesign authentication;
- perform unrelated cleanup/refactoring.

Keep this change tightly scoped.

---

# 39. DOCUMENTATION

If new implementation decisions are required, document them.

In particular:

- distinguish official MCR rules from application rendering conventions;
- do not present the existing dealer-anchored visual break convention as an official MCR rule;
- preserve the existing standard in `docs/rules/decisions.md` of citing rulebook sections for structural/rules decisions.

If you discover that an existing documented decision is now inaccurate, flag it rather than silently contradicting it.

---

# 40. FINAL CODEX REPORT

At completion, provide a concise report containing:

### Rules verification

List the relevant `mcr_EN.pdf` sections actually checked.

### Existing architecture found

Explain:

- wall representation;
- front/back pointers;
- initial deal;
- Flower handling;
- Kong replacement handling;
- existing Phase 8 rendering.

### Changes made

List files changed and purpose.

### Engine changes

Explicitly state whether any engine behaviour changed.

If yes, explain exactly why.

### Visual behaviour

Explain:

- initial wall;
- dealing;
- normal draws;
- Flower replacement;
- Kong replacement.

### Tests

Report:

- new tests added;
- engine test result;
- UI/Vitest result;
- typecheck result;
- Playwright/E2E result where applicable.

### Remaining limitations

Explicitly state whether the visible wall break still uses the existing rendering convention rather than a fully simulated MCR dice-based break.

Do not hide this distinction.

---

# Core Principle

The goal is not merely to draw Mahjong-looking tiles around the table.

The goal is for the player to be able to watch a **realistic physical representation of the actual MCR wall state**:

**144 physical tiles → four 18×2 walls → deal from the front → normal draws from the front → Flower/Kong replacements from the back → wall progressively depleted.**

The visual wall must always tell the same story as the game engine.