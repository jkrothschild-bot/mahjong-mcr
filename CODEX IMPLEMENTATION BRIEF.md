# CODEX IMPLEMENTATION BRIEF
## MCR Mahjong Mentor — Landing Page, Accounts, Save/Resume & Analytics

### Repository

`jkrothschild-bot/mahjong-mcr`

### Working branch

Create/use:

`feat/landing-auth-persistence`

Base this branch on `main`.

Do not develop this work on Claude's current Strategy Coach branch:

`feat/phase10-stage3`

---

# 1. Authoritative requirements

Before changing code, read:

1. `CLAUDE.md`
2. `SPEC.md`
3. `PLAN.md`
4. `OPEN-WORK.md`
5. `Mahjong Learning Game — Landing Page, Accounts & Saved Games Specification.md`

The last document is the authoritative product specification for this workstream.

This implementation brief is explicit owner authorisation for a **parallel landing/account/persistence workstream**, despite the normal `CLAUDE.md` instruction to work only on the current gameplay milestone.

Do not modify or redirect the ongoing Phase 10 Strategy Coach work.

---

# 2. Primary objective

Turn the existing direct-to-game application into a small product shell that supports:

- Public landing page.
- MCR only.
- Solo play against the existing bots.
- Learning Mode.
- Play Without Help.
- Guest play without registration.
- Email/password account registration.
- Login/logout/password reset.
- Automatic local game saving for guests.
- Automatic cloud game saving for registered users.
- Resume an unfinished game later.
- Cross-device resume for registered users.
- Guest-to-account save migration.
- Basic product analytics.

Do not build speculative future functionality.

---

# 3. Explicit non-goals

Do NOT implement:

- Riichi.
- Hong Kong Mahjong.
- Taiwanese Mahjong.
- Variant-selection screens.
- Multiplayer.
- Private rooms.
- Matchmaking.
- Leaderboards.
- Rankings.
- Tournaments.
- OAuth.
- Paid subscriptions.
- Advertising.
- PWA/offline installation.
- Post-game AI analysis.
- New Strategy Coach logic.
- New fan detection.
- New scoring rules.
- New shanten algorithms.
- New bot strategy.

Do not advertise future variants as "Coming Soon".

---

# 4. Parallel-development safety boundary

Claude currently owns the Strategy Coach/scoring/rules workstream.

## Codex MUST NOT modify

Unless absolutely required for a narrow persistence interface:

- `packages/engine/src/scoring/**`
- `packages/engine/src/fan-targets.ts`
- `packages/engine/src/fan-targets.test.ts`
- `packages/engine/src/hints.ts`
- `packages/engine/src/hints.test.ts`
- win-validation logic
- scoring exclusion logic
- shanten algorithms
- bot strategy/ranking
- Strategy Coach calculations

Also avoid broad changes to:

- `packages/ui/src/hints/**`

These areas are likely to continue evolving in the other development lane.

If a requirement appears to demand new Mahjong logic, STOP that part of the implementation and expose/use an interface instead.

Never reproduce Mahjong logic in the landing/account layer.

---

# 5. Existing architecture to preserve

The repository is an npm workspace with:

```text
packages/
  engine/
  ui/
validation/
```

The root `npm run dev` starts `@mahjong-mcr/ui`.

The current UI application is React + Vite + Tailwind.

Current entry point:

```text
packages/ui/src/main.tsx
```

currently renders:

```tsx
<App />
```

The current game itself is largely coordinated from:

```text
packages/ui/src/App.tsx
```

`App.tsx` should be treated as the **existing game application**, not rewritten into a marketing application.

The current live game loop is in:

```text
packages/ui/src/game/useGameLoop.ts
```

The engine is designed to have fully serialisable state.

The existing game loop already tracks:

- `GameState`
- `MatchState`
- match scores
- per-hand move logs
- stable start parameters

and replay support already exists.

Exploit this architecture rather than inventing a second game model.

---

# 6. Minimise changes to App.tsx

Do not turn the current `App.tsx` into a large router/landing/auth component.

Preferred architecture:

```text
main.tsx
  ↓
RootApp / AppRouter
  ├── LandingPage
  ├── PlayPage
  ├── LoginPage
  ├── RegisterPage
  ├── ResetPasswordPage
  ├── AccountPage
  └── GamePage
        ↓
      existing App
```

The current game should remain largely intact.

It is acceptable to make small changes to `App.tsx` for:

- GameConfig/assistance capability consumption.
- Persistence callbacks.
- Account/navigation UI where genuinely necessary.

Do not opportunistically refactor the board/game UI.

---

# 7. Routing

Introduce proper application routing.

Required routes:

```text
/             Landing page
/play         Learning Mode / Play Without Help
/game         Existing game
/login        Login
/register     Account registration
/reset        Password reset
/account      Basic account page
```

Use a mainstream React router rather than implementing ad-hoc pathname parsing unless there is a compelling repository-specific reason not to.

`/game` must not silently create an undefined configuration.

If no valid game configuration/current session exists, redirect to `/play` or restore the resumable session.

Preserve SPA refresh behaviour.

If deployment hosting requires a fallback rewrite to `index.html`, document this rather than switching to ugly URL behaviour without discussion.

---

# 8. Game configuration

Introduce only the configuration needed now:

```ts
export interface GameConfig {
  variant: 'mcr'
  assistance: 'learning' | 'none'
  mode: 'solo'
}
```

Do not introduce a generic multi-ruleset framework.

MCR is the only variant.

Solo is the only gameplay mode.

The only actual player choice is assistance.

---

# 9. Assistance modes

Support:

## Learning Mode

Existing teaching functionality is available.

## Play Without Help

Strategic assistance is not presented.

Do not modify the calculation engines.

Implement UI-level capability gating around existing functionality.

Prefer a small capability definition such as:

```ts
export interface AssistanceCapabilities {
  showStrategyCoach: boolean
  showHandInformation: boolean
  showTileCounts: boolean
  showScoringHelp: boolean
}
```

Derive it centrally from `GameConfig`.

Do not scatter:

```ts
if (mode === 'learning')
```

through many components.

Before hiding an existing control, distinguish:

- information required to legally operate the game, versus
- strategic/learning assistance.

"Play Without Help" must remain a fully playable legal MCR game.

---

# 10. Landing page

Create a polished but restrained landing page.

Primary positioning:

> Learn Mahjong by actually playing it

Supporting message:

> Play Chinese Official Mahjong (MCR) against computer opponents, with strategy and scoring explained while you play.

Primary CTA:

> Start Playing Free

Supporting text:

> No download required · No account needed to try it

Secondary account CTA:

> Create Account

Header should provide Login when logged out and Account/Logout access when logged in.

Do not include disabled Riichi/Hong Kong/Taiwanese cards.

Do not make promises about multiplayer or other variants.

---

# 11. Landing page feature content

Keep the page relatively short.

Include approximately:

### Hero

Headline, explanation, Start Playing CTA.

### Product demonstration

Use an actual screenshot/game representation where practical.

Show the teaching/hint experience rather than generic Mahjong imagery.

### Benefits

Focus on real functionality:

- Learn as you play.
- Understand MCR scoring.
- Choose Learning Mode or Play Without Help.
- Save and continue later with an account.

### How it works

1. Choose how you want to play.
2. Play against computer opponents.
3. Learn from situations occurring in the game.

### Footer

Include placeholders/routes for:

- Privacy.
- Terms.
- Feedback/contact.

Do not invent unsupported claims.

---

# 12. `/play` page

Only ask one meaningful question:

> How would you like to play?

Provide:

### Learning Mode

Recommended for players learning MCR.

### Play Without Help

Same MCR game without strategic assistance.

Do NOT ask the player to choose:

- ruleset,
- multiplayer/solo,
- number of players.

Those are not genuine choices yet.

Persist the user's most recently used assistance choice locally and, when registered, in their profile where appropriate.

---

# 13. Authentication platform

Use Supabase unless current implementation research uncovers a material incompatibility.

Add:

```text
@supabase/supabase-js
```

Keep all provider-specific calls behind a small service layer.

Suggested structure:

```text
src/auth/
  AuthContext.tsx
  AuthService.ts
  supabaseAuthService.ts
  authTypes.ts
```

The React UI must not import Supabase directly throughout the application.

---

# 14. Supabase environment variables

Use Vite environment variables.

Expected:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Never commit real credentials.

Provide:

```text
.env.example
```

with placeholders.

NEVER put a Supabase service-role key in frontend code.

If credentials are unavailable during implementation, ensure the project still builds and fails gracefully with an actionable development message rather than crashing at import time.

---

# 15. Authentication functions

Initial auth must support:

- Register with email/password.
- Login.
- Logout.
- Password reset.
- Restore authenticated browser session.
- Appropriate email verification behaviour based on current Supabase configuration.

Do not implement OAuth in this task.

Registration should optionally capture a display name.

Account creation must not be required before a user can try the game.

---

# 16. Auth user experience

Guest path:

```text
Landing
→ Start Playing
→ Choose mode
→ Game
```

No signup wall.

Registered path:

```text
Landing
→ Login
→ resume game OR start game
```

Registration should be promoted as:

> Save your progress, continue on another device and keep your playing history.

Do not repeatedly interrupt live gameplay with signup prompts.

---

# 17. Persistence architecture

Create a persistence abstraction independent of Supabase.

Suggested:

```ts
export interface GamePersistence {
  loadActiveGame(): Promise<SavedGame | null>
  saveActiveGame(game: SavedGame): Promise<void>
  clearActiveGame(): Promise<void>
}
```

Provide at least:

```text
LocalGamePersistence
SupabaseGamePersistence
```

Guest:

```text
LocalGamePersistence
```

Authenticated:

```text
SupabaseGamePersistence
```

A local recovery copy for authenticated players is strongly recommended so a temporary network failure cannot destroy progress.

---

# 18. Saved-game model

Define a versioned persisted format.

For example:

```ts
export interface SavedGameV1 {
  schemaVersion: 1
  savedAt: string
  config: GameConfig
  game: PersistedMatchState
}
```

Do not blindly serialise arbitrary React component state.

Persist only state required to reconstruct the actual game.

The saved format must be JSON serialisable.

---

# 19. Leverage the current game-loop design

Inspect:

```text
packages/ui/src/game/useGameLoop.ts
```

before designing persistence.

It currently owns a reducer state containing:

```text
gameState
matchState
matchScores
matchMoveLogs
```

These are likely the correct raw ingredients for persistence.

Prefer exposing a clean snapshot/restore boundary from the existing game-loop orchestration rather than creating duplicated state.

A reasonable design may be conceptually:

```ts
export interface PersistableMatch {
  gameState: GameState
  matchState: MatchState
  matchScores: Record<Seat, number>
  matchMoveLogs: HandMoveLog[]
}
```

but inspect the actual engine types and prove that restore works before fixing the schema.

Do not alter the engine merely to satisfy an assumed persistence design if the existing serialisable data already suffices.

---

# 20. Restore capability

Modify `useGameLoop` only as narrowly as necessary to allow initialization from a validated saved snapshot.

For example, a future shape could be:

```ts
useGameLoop({
  matchSeed,
  botSpeedMs,
  initialSnapshot,
  onSnapshotChange,
})
```

Exact API is up to the implementation after inspecting the current hook.

Requirements:

- Fresh game behaviour stays unchanged.
- Restored game exactly reproduces the saved game state.
- Bot timers safely resume after restoration.
- UI-only modal state does not need persistence.
- No duplicate move is introduced on restore.
- No settlement is applied twice.
- No completed hand is counted twice in statistics.

Add tests for these cases.

---

# 21. Autosave

Saving must be automatic.

Trigger saving following meaningful game-state changes.

Do not require a manual Save button.

Avoid writing on irrelevant UI changes such as opening Settings.

Debounce/batch cloud writes if appropriate.

Local saves may be immediate if inexpensive.

The save system must not alter reducer purity.

---

# 22. Guest persistence

Guests should be assigned a local anonymous visitor/session identifier for analytics purposes, but they do not need a registered account.

Save unfinished game state in browser storage.

Use a separate versioned storage key from existing settings.

The repository already has a good defensive localStorage pattern in `useSettings.ts`:

- read safely,
- tolerate corrupt JSON,
- catch browser storage errors,
- fall back instead of crashing.

Follow that style.

Guest behaviour:

- Refresh → game survives.
- Close/reopen browser → game survives where browser storage remains.
- Same device → resume available.
- Different device → no guest cross-device resume.

---

# 23. Registered persistence

Create Supabase persistence for registered users.

Suggested table:

```sql
game_sessions
```

Fields should support at least:

```text
id
user_id
variant
assistance_mode
status
state_version
state_json
started_at
updated_at
finished_at
result
final_score
```

Status:

```text
active
completed
abandoned
```

For MVP, support one obvious active resumable game per user.

Do not build a multi-slot save-game manager.

---

# 24. Profile data

Create a small `profiles` table.

Possible fields:

```text
id
display_name
preferred_assistance
created_at
updated_at
```

Keep it minimal.

Do not create a social/player-profile system.

---

# 25. Row Level Security

RLS is mandatory.

Create migration/policy SQL.

Users must be able to:

- read their own profile,
- update their own profile,
- read their own game sessions,
- create/update their own game sessions.

A normal authenticated user must not be able to read another user's data.

Add documentation explaining how to validate this manually in Supabase.

Do not rely on React route protection as database security.

---

# 26. Offline/network failure

Authenticated players must not lose their game because Supabase temporarily cannot be reached.

Recommended behaviour:

1. Always maintain a local recovery snapshot.
2. Attempt cloud save.
3. Mark save status.
4. Retry later when appropriate.

Possible non-blocking UI states:

```text
Saved
Saving…
Saved locally — reconnecting…
```

Do not prevent the player from continuing because a cloud write failed.

---

# 27. Guest → registered migration

This flow is important and must have explicit tests.

If a guest with an unfinished local game registers:

1. Keep the local snapshot.
2. Create/authenticate account.
3. Upload the game to the user's cloud session.
4. Verify success.
5. Only then consider local state superseded.

Never delete the local snapshot first.

On failure, local resume must still work.

---

# 28. Resume behaviour

Landing page should check for a resumable game.

If one exists, primary action can become:

> Resume Game

with secondary:

> Start New Game

Show small useful context where readily available:

- Learning Mode / Without Help.
- Last saved time.
- Current round if safe to derive.

Do not calculate Mahjong details purely for the resume card.

Starting a new game when an unfinished game exists must require confirmation before overwriting/abandoning it.

---

# 29. Session completion

When the match is genuinely completed:

- Mark cloud/local session completed.
- Do not continue offering it as "Resume".
- Preserve basic history for registered users.
- Clear only the active-game pointer, not legitimate history.

Restarting/abandoning should be distinguished from completing.

---

# 30. Analytics

Create an analytics abstraction.

Suggested:

```ts
export interface AnalyticsService {
  track(event: AnalyticsEvent): void | Promise<void>
  identify?(userId: string): void | Promise<void>
}
```

Do not scatter provider calls throughout components.

Track a small, deliberate event set:

```text
landing_page_viewed
game_started
learning_mode_selected
without_help_selected
hand_started
hand_completed
game_completed
hint_viewed
scoring_explanation_viewed
registration_started
registration_completed
return_visit
saved_game_resumed
```

Do not attach email addresses, names or hand contents unless there is a clear product reason.

---

# 31. Analytics identity

For a guest:

- Generate a random visitor ID.
- Persist it locally.
- Do not use browser fingerprinting.

For a registered user:

- Associate future events with the internal auth user ID where appropriate.

It should eventually be possible to distinguish:

- visitors,
- people who started games,
- engaged players,
- registered users,
- returning players,
- resumed-game users.

Registration count alone is not the usage metric.

---

# 32. Analytics storage

Because Supabase is already being introduced, a simple MVP telemetry table is acceptable.

For example:

```text
analytics_events
----------------
id
visitor_id
user_id nullable
event_name
session_id
properties jsonb
created_at
```

Do not expose client SELECT access to analytics events.

Keep event properties minimal.

If direct anonymous insertion is used for MVP, document that analytics events are inherently untrusted telemetry and can be spammed; do not use them for security or financial logic.

Do not delay the product over building a sophisticated analytics platform.

---

# 33. Existing settings

Do not merge game configuration indiscriminately into existing Settings.

Existing settings include things such as:

- bot speed,
- tile scale.

Keep:

**player display/preferences**

separate conceptually from:

**configuration of the current game session**.

It is reasonable to persist the most recently selected assistance mode as a preference.

---

# 34. Suggested new UI structure

A reasonable structure is:

```text
packages/ui/src/
  app/
    RootApp.tsx
    routes.tsx
    GameConfigContext.tsx

  pages/
    LandingPage.tsx
    PlayPage.tsx
    GamePage.tsx
    LoginPage.tsx
    RegisterPage.tsx
    ResetPasswordPage.tsx
    AccountPage.tsx

  auth/
    AuthContext.tsx
    authTypes.ts
    AuthService.ts
    supabaseAuthService.ts

  persistence/
    savedGameTypes.ts
    GamePersistence.ts
    localGamePersistence.ts
    supabaseGamePersistence.ts
    persistenceCoordinator.ts

  analytics/
    AnalyticsService.ts
    analyticsEvents.ts
    supabaseAnalytics.ts

  components/
    AppHeader.tsx
    ResumeGameCard.tsx
```

This is guidance, not a requirement to create unnecessary files.

Prefer simple, cohesive modules over abstraction for abstraction's sake.

---

# 35. Keep the current game visually stable

The existing game board has extensive layout rules and iPad constraints.

Do not use this project as an opportunity to restyle it.

Landing page styling may be new.

The actual `/game` layout should remain visually and behaviourally equivalent except for:

- navigation/account integration,
- assistance-mode gating,
- save-status/resume requirements where necessary.

Respect the repo's existing:

- ≥44px touch targets,
- no-scroll game viewport,
- safe-area behaviour,
- stable tile IDs,
- no-auto-sort requirement.

---

# 36. Tests

Do not rely only on visual checking.

Add unit/integration tests for at least:

### Routing

- Landing loads at `/`.
- `/play` loads.
- `/game` with invalid/no config safely redirects or restores.
- Login/register routes render.

### Game modes

- Learning Mode exposes learning controls.
- Without Help does not expose strategic-assistance controls.
- Underlying game remains playable.

### Local persistence

- Valid saved snapshot loads.
- Invalid JSON does not crash.
- Unsupported schema version is rejected safely.
- Save errors do not crash game.
- Local resume works.

### Restore

- A saved reducer/game state restores exactly.
- Current turn is preserved.
- Melds/discards/wall state are preserved.
- Match totals are preserved.
- Move logs/replay still work.
- Bot continuation after restore does not duplicate a move.

### Auth

Mock service boundary where appropriate:

- logged-out state,
- logged-in state,
- registration error,
- login error,
- logout.

### Guest migration

- local save remains until successful cloud upload.
- failed cloud upload does not destroy local game.

### Resume UI

- unfinished game → Resume shown.
- completed game → Resume not shown.

---

# 37. End-to-end testing

Extend the existing Playwright setup for critical flows.

At minimum:

### Guest

```text
Landing
→ Start Playing
→ Learning Mode
→ begin game
→ reload
→ resume same game
```

### Without Help

```text
Landing
→ Play Without Help
→ game
→ no strategic Hint UI
```

### Registration

Where Supabase can be safely mocked/tested:

```text
guest game
→ register
→ migrate saved state
→ authenticated resume
```

Avoid tests that depend on a real production Supabase database.

---

# 38. iPad and responsiveness

Test the new application shell specifically at iPad-like viewports.

Both:

- landscape,
- portrait.

Landing/auth pages may scroll normally.

The game route must preserve the current game's no-scroll viewport assumptions.

Ensure:

- ≥44px controls,
- no hover-only actions,
- safe-area handling,
- auth forms usable with mobile keyboard,
- browser Back does not silently destroy an active game.

---

# 39. Build quality gates

Before every commit:

```bash
npm run typecheck
npm test
npm run build
```

Also run UI lint/e2e as appropriate:

```bash
npm run lint --workspace=@mahjong-mcr/ui
npm run test:e2e --workspace=@mahjong-mcr/ui
```

Do not commit red.

No scoring-validation harness run is necessary when no scoring/rule files are touched.

If Codex unexpectedly touches scoring/rules files, that is evidence the workstream boundary has been violated and should be reconsidered before committing.

---

# 40. Commit strategy

Use small commits.

Suggested sequence:

### Commit 1
Application shell + router + preserve current `/game`.

### Commit 2
Landing page + `/play` mode selection.

### Commit 3
GameConfig + assistance capability gating.

### Commit 4
Versioned local persistence + resume.

### Commit 5
Supabase service setup + auth UI.

### Commit 6
Database migrations/RLS + cloud game persistence.

### Commit 7
Guest → account migration + network recovery.

### Commit 8
Analytics abstraction/events.

### Commit 9
E2E/responsive/accessibility polish.

Do not mix unrelated cleanup into these commits.

---

# 41. Documentation

Create/update documentation for:

- required environment variables,
- local setup,
- Supabase project setup,
- SQL migrations,
- RLS verification,
- auth redirect configuration,
- running the app,
- testing save/resume.

Do not commit secrets.

If deployment configuration is required for SPA routes/auth redirects, record it clearly.

---

# 42. Deferred work

Follow the repository rule:

Nothing is considered "deferred" merely because it was mentioned in an agent response.

If implementation discovers legitimate future work that is deliberately postponed, record it in the repository's proper tracking document as required by `CLAUDE.md`.

Avoid copying whole requirements between documents.

---

# 43. Stop conditions / ask-for-owner-decision items

Do not invent product decisions in these areas.

If encountered, implement the safest minimal behaviour and clearly flag it in the handoff:

- Supabase project does not yet exist or credentials unavailable.
- Public deployment domain is unknown for auth redirect configuration.
- Exact privacy-policy/legal wording.
- Analytics dashboard/reporting product choice beyond basic data capture.
- Existing game state cannot be safely restored without a broader game-loop change.
- A required change overlaps files actively modified on `feat/phase10-stage3`.

Do not solve these by modifying scoring or Strategy Coach logic.

---

# 44. Definition of Done

This workstream is complete when:

1. `/` is a real landing page rather than immediately launching the game.
2. New users can start playing without registering.
3. Users choose Learning Mode or Play Without Help.
4. Both modes use the existing MCR game engine.
5. Without Help suppresses strategic learning assistance.
6. Guests automatically save locally.
7. Guests can refresh/close/reopen and resume on the same browser where storage survives.
8. Users can register/login/logout/reset password.
9. Registered users automatically save their active game to Supabase.
10. Registered users can resume after logging in on another device.
11. A guest can register without losing an unfinished game.
12. Temporary cloud failure does not destroy progress.
13. An unfinished game produces a prominent Resume action.
14. Completed games do not appear as unfinished.
15. Basic product events are captured.
16. RLS prevents users reading another user's game/profile data.
17. Existing scoring, rules and Strategy Coach behaviour have not been changed by this work.
18. Existing unit tests still pass.
19. New persistence/auth/routing tests pass.
20. Application builds cleanly.
21. Critical guest/save/resume flow works at iPad viewport sizes.

---

# 45. First action before coding

Perform a repository-orientation pass.

Specifically inspect:

```text
packages/ui/src/main.tsx
packages/ui/src/App.tsx
packages/ui/src/game/useGameLoop.ts
packages/ui/src/settings/useSettings.ts
packages/ui/src/replay/**
packages/ui/src/stats/**
packages/ui/package.json
```

Then write a short implementation plan identifying:

- files expected to change,
- new files/directories,
- how current `LoopState` will be persisted/restored,
- which existing App controls will be gated in Play Without Help,
- whether any proposed change risks overlapping the Phase 10 branch.

Only then begin implementation.

The overarching rule is:

> Build the product shell around the existing Mahjong game. Do not rebuild the Mahjong game to fit the shell.