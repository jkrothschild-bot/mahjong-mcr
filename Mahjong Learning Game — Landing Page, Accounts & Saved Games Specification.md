# Mahjong Learning Game — Landing Page, Accounts & Saved Games Specification

**Status:** Proposed implementation specification  
**Initial ruleset:** Chinese Official Mahjong / Mahjong Competition Rules (MCR)  
**Initial game modes:** Learning Mode and Play Without Help  
**Target:** Desktop browsers and iPad Safari  
**Purpose:** Provide a professional entry point to the existing Mahjong game, allow users to register and return to saved games, and provide basic usage information without expanding the product beyond functionality that is genuinely planned for the initial release.

---

# 1. Objectives

The first release should provide a simple path from discovering the application to playing Mahjong.

The user should be able to:

1. Understand immediately what the application offers.
2. Start an MCR Mahjong game quickly.
3. Choose between:
   - Learning Mode
   - Play Without Help
4. Play without having to create an account first.
5. Create an account if they want their progress and games saved permanently.
6. Leave a game part way through and resume it later.
7. Resume registered-user games on another device.
8. Log back in and see that an unfinished game is available.
9. Have their use of the application counted in basic product analytics regardless of whether they register.

The first release should **not imply that other Mahjong variants, multiplayer or other significant features are arriving soon** unless there is a genuine delivery plan for them.

---

# 2. Product positioning

The application's key point of difference is not simply that it provides online Mahjong.

Its differentiator is:

> **A Mahjong game that teaches you why.**

The application should be positioned as a way to learn Chinese Official Mahjong by actually playing against computer opponents, with strategy and scoring explained during the game.

Possible main headline:

## Learn Mahjong by actually playing it

Supporting message:

**Play Chinese Official Mahjong (MCR) against computer opponents, with strategy, scoring and recommended moves explained while you play.**

Primary CTA:

**Start Playing Free**

Supporting micro-copy:

**No download required · No account needed to try it**

The landing page should avoid generic claims such as "The ultimate Mahjong experience" or promises about functionality that does not yet exist.

---

# 3. Initial product scope

The initial public-facing product consists of:

- Chinese Official Mahjong / MCR only.
- Solo play against existing computer opponents.
- Two assistance modes.
- Landing page.
- Game-mode selection.
- Registration.
- Login/logout.
- Password reset.
- Automatic saved games.
- Resume unfinished game.
- User preferences.
- Basic player statistics where straightforward.
- Basic product analytics.

The game engine itself remains the authoritative source for:

- Legal Mahjong hands.
- MCR scoring.
- Fan recognition.
- 8-point minimum validation.
- Shanten.
- Outs.
- Hint calculations.
- Bot behaviour.
- Game rules and sequencing.

---

# 4. Explicitly out of scope for the initial release

Do **not** build the following as part of this work:

- Riichi Mahjong.
- Hong Kong Mahjong.
- Taiwanese Mahjong.
- Variant-selection infrastructure beyond what is necessary for MCR.
- Multiplayer.
- Private rooms.
- Matchmaking.
- Leaderboards.
- Ranked play.
- Tournaments.
- Spectator mode.
- Social features.
- Friends lists.
- OAuth unless it becomes particularly easy to add after basic auth is stable.
- Paid subscriptions.
- Cosmetics.
- Advertising systems.
- PWA/offline installation.
- Advanced post-game AI review.
- Training drill modes.
- Standalone score calculator.
- Large player-profile system.

These may be considered later but should not influence the first landing page strongly.

In particular, the site should **not display Riichi, Hong Kong or Taiwanese Mahjong as disabled "Coming Soon" choices**. Doing so could create an expectation that these variants are actively being developed.

---

# 5. Game modes

Only two modes should initially be presented.

## 5.1 Learning Mode

Designed for players who are learning MCR or want assistance while playing.

Learning Mode may include existing and future capabilities such as:

- Recommended discard.
- Explanation of why a discard is recommended.
- Shanten information.
- Useful-tile / outs information.
- Fan already present in the hand.
- Potential scoring combinations.
- Progress toward the MCR 8-point minimum.
- Explanation of whether Chow, Pung or Kong is strategically useful.
- Scoring explanation after a completed hand.
- Undo functionality if currently supported and appropriate.

The scoring and hint engines determine what information is actually available.

The landing-page project must **not duplicate Mahjong logic** merely to provide Learning Mode.

## 5.2 Play Without Help

The same MCR game against the same computer opponents, but strategic assistance is hidden.

This mode should disable things such as:

- Recommended discards.
- Shanten assistance.
- Fan-progress advice.
- Strategic explanations.

Normal game information required to play legally must remain available.

Do not call this mode "Expert Mode". Players may simply want to practise without assistance.

---

# 6. Initial GameConfig

Avoid introducing a large multi-ruleset architecture at this stage.

A simple configuration is sufficient:

```ts
interface GameConfig {
  variant: 'mcr';
  assistance: 'learning' | 'none';
  mode: 'solo';
}
```

This gives the application a clean configuration boundary without designing abstractions for variants that do not yet exist.

If another ruleset is genuinely developed later, the interface can be expanded.

---

# 7. Assistance capabilities

Where practical, avoid hardcoding checks such as:

```ts
if (mode === 'learning')
```

throughout the application.

Instead, the assistance configuration should expose capabilities, for example:

```ts
interface AssistanceCapabilities {
  showDiscardSuggestions: boolean;
  showShanten: boolean;
  showFanProgress: boolean;
  explainScoring: boolean;
  allowUndo: boolean;
}
```

Initial configurations might be:

```ts
learning = {
  showDiscardSuggestions: true,
  showShanten: true,
  showFanProgress: true,
  explainScoring: true,
  allowUndo: true
}

none = {
  showDiscardSuggestions: false,
  showShanten: false,
  showFanProgress: false,
  explainScoring: false,
  allowUndo: false
}
```

The exact capabilities should match functionality already supported by the game.

Do not build placeholder assistance features merely because they appear in this interface.

---

# 8. Landing page structure

## 8.1 Header

Keep the header simple.

Suggested items:

- Logo / Mahjong application name.
- Learn / Rules link if an existing useful rules page is available.
- Log In when logged out.
- Account/Profile when logged in.

Avoid a large navigation structure at this stage.

---

# 9. Hero section

The hero section is the most important area of the landing page.

Suggested structure:

## Learn Mahjong by actually playing it

**Play Chinese Official Mahjong (MCR) against computer opponents, with strategy and scoring explained while you play.**

### Primary CTA

**Start Playing Free**

### Secondary CTA

**Create Account**

A smaller **Log In** option should also be available.

Supporting text:

**No download required · No account needed to try it**

The primary CTA should not say "Play as Guest".

A first-time visitor cares about playing the game, not their account classification.

---

# 10. Demonstrate the teaching feature visually

The landing page should show the actual game rather than relying entirely on descriptive marketing text.

Ideally use:

- A screenshot of the real Mahjong table.
- A visible hint panel.
- A realistic example of the teaching information.

For example:

**Recommended: Discard 9 Characters**

*This keeps your 3-4-5 Bamboo shape intact and gives you more useful tiles that can improve your hand.*

*You currently have 4 points identified toward the 8-point minimum.*

This example should eventually be replaced by an actual screenshot or genuine output from the application rather than permanently using mock content.

The aim is for visitors to understand the application's differentiation within a few seconds.

---

# 11. Feature section

Limit the landing page to features that actually exist or are part of this release.

Suggested feature cards:

## Learn as you play

Get explanations of useful moves rather than having to learn MCR entirely from a rule book.

## Understand MCR scoring

See how scoring combinations contribute toward the 8-point minimum.

## Play at your own level

Choose full Learning Mode assistance or play the same game without strategic help.

## Stop and continue later

Registered players can leave a game and return to it later without losing progress.

Avoid claims such as "81 scoring patterns fully explained" until the scoring engine has been validated sufficiently to support the claim confidently.

---

# 12. How it works

A simple three-step section is sufficient.

### 1. Choose how you want to play

Learning Mode or Play Without Help.

### 2. Play against computer opponents

Learn MCR without waiting for other players.

### 3. Improve through experience

Learning Mode explains strategy and scoring as situations occur naturally in the game.

---

# 13. Account strategy

Registration is part of the first release, but registration should **not be mandatory before somebody can try the game**.

There are two user states.

## 13.1 Guest

A guest can:

- Start playing immediately.
- Select Learning Mode or Play Without Help.
- Have the current unfinished game automatically saved locally.
- Close the browser and resume on the same browser/device where local storage remains available.

Guest limitations:

- Saved game is device/browser specific.
- Clearing browser data may remove the game.
- Game cannot reliably be resumed on another device.
- Long-term history is not guaranteed.

## 13.2 Registered user

A registered player can:

- Log in.
- Automatically save unfinished games to the server.
- Resume games later.
- Resume on another supported device/browser.
- Retain game history.
- Retain preferences.
- Potentially receive more detailed personal statistics later.

---

# 14. Registration benefits

Registration should be presented as a useful feature rather than an artificial barrier.

Suggested messaging:

## Save your progress

**Create a free account to save unfinished games, continue on another device and keep your playing history.**

Good moments to encourage registration include:

- After the player has started using the game.
- When they leave an unfinished game.
- At the end of their first hand or game.
- When they choose a "Save progress" or similar action.

Do not repeatedly interrupt gameplay with registration prompts.

---

# 15. Authentication

Supabase remains a reasonable proposed platform for authentication and persistence, subject to checking current pricing, API behaviour and limits immediately before implementation.

Initially support:

- Email registration.
- Password login.
- Logout.
- Password reset.
- Email verification if appropriate.
- Persistent logged-in sessions.

OAuth with Google, Apple etc. can be considered later.

All Supabase-specific calls should preferably sit behind small service interfaces rather than being scattered throughout UI components.

Example:

```ts
interface AuthService {
  getCurrentUser(): Promise<User | null>;
  signUp(email: string, password: string): Promise<AuthResult>;
  signIn(email: string, password: string): Promise<AuthResult>;
  signOut(): Promise<void>;
  resetPassword(email: string): Promise<void>;
}
```

This reduces coupling between the UI and the chosen backend provider.

---

# 16. Saved-game requirements

Automatic save/resume is an MVP feature.

Players should not need to press a traditional "Save Game" button after every session.

The application should automatically save after meaningful state changes.

Examples include:

- Player draws.
- Player discards.
- Player claims Chow.
- Player claims Pung.
- Player declares Kong.
- Relevant bot turn completes.
- Hand finishes.
- New hand begins.
- Relevant round/game state changes.

Saving frequency must be designed carefully so that it does not produce unnecessary server writes while still preventing meaningful progress loss.

A short debounce/batching mechanism may be appropriate depending on the game's state architecture.

---

# 17. Game state serialization

The game engine should expose a clean persistence boundary.

Conceptually:

```ts
serializeGameState(): SavedGameState
```

and:

```ts
restoreGameState(savedState: SavedGameState): GameState
```

The persistence layer should **not need to understand Mahjong rules**.

Saved state must include everything necessary to reconstruct the game exactly.

Potential examples include:

- Stable tile IDs.
- Tile locations.
- Player hands.
- Melds.
- Discards.
- Wall state.
- Current player.
- Dealer.
- Seat winds.
- Round wind.
- Scores.
- Flowers.
- Kongs.
- Current game phase.
- Relevant bot state.
- Game configuration.
- Randomisation/seed information where required.
- Any other state required to continue deterministically.

The exact saved-state schema must be derived from the real game engine rather than guessed during landing-page development.

---

# 18. Saved-game compatibility

Every saved game should contain a schema/version identifier.

For example:

```ts
interface SavedGame {
  version: number;
  gameConfig: GameConfig;
  state: SavedGameState;
  savedAt: string;
}
```

This is important because the game engine will change over time.

If the structure changes significantly, the application must either:

- migrate older saved games, or
- detect that they cannot safely be restored and explain this clearly.

Do not silently load incompatible saved state.

---

# 19. Guest saving

For non-registered players:

- Save the current active game to localStorage or equivalent browser storage.
- Store the selected assistance mode.
- Store enough information to recognise an unfinished game.

On returning to the landing page, show:

## Continue your game?

**You have an unfinished Mahjong game on this device.**

Buttons:

**Resume Game**

**Start New Game**

If Start New Game would overwrite an unfinished game, request confirmation.

---

# 20. Registered-user saving

For authenticated players, persist the active game in Supabase.

Suggested conceptual structure:

```text
game_sessions
-------------
id
user_id
variant
assistance_mode
status
started_at
updated_at
finished_at
state_version
state_json
result
final_score
```

Possible statuses:

```text
active
completed
abandoned
```

A user should normally have one obvious resumable active game unless the product later explicitly supports multiple saved games.

---

# 21. Resume experience

When a registered player returns and has an unfinished game:

## Welcome back

**You have an unfinished game.**

**Resume Game**

Secondary option:

**Start New Game**

Relevant context may be shown, for example:

- Learning Mode.
- Current round.
- Time/date last played.

Do not require the user to navigate through account history merely to resume the game.

The landing page primary CTA may change from:

**Start Playing Free**

to:

**Resume Game**

when an unfinished game exists.

---

# 22. Guest-to-account upgrade

If a guest creates an account while an unfinished local game exists:

1. Create/authenticate the account.
2. Preserve the local saved game.
3. Associate/upload the game to the registered user's cloud storage.
4. Confirm that the cloud save succeeded.
5. Only then remove or supersede the temporary local-only state.

Never destroy the local game before confirming the cloud save.

This migration path needs explicit testing.

---

# 23. Basic account area

Keep the first account area minimal.

Initially it may include:

- Display name.
- Email.
- Preferred game mode.
- Active saved game.
- Basic playing statistics where available.
- Logout.

Avoid building a large social/player profile.

---

# 24. Basic statistics

Useful first-release statistics may include:

- Games started.
- Games completed.
- Hands won.
- Total hands played.
- Win percentage.
- Learning Mode vs Without Help usage.

Only include statistics that can be calculated reliably from existing game events.

More sophisticated statistics can come later.

---

# 25. Product analytics

Registration numbers alone are not sufficient for determining whether people are actually using the product.

Basic anonymous/product analytics should therefore be included.

Important events might include:

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

The objective is not invasive tracking.

The objective is to answer questions such as:

- How many people try the application?
- How many actually start a game?
- How many complete a hand?
- Do people use Learning Mode?
- Do they look at hints?
- How many return?
- How many register?
- How many registered users resume games?
- Where do users tend to stop?

Where possible, analytics should use anonymous IDs for guests and the internal user ID for registered users without unnecessarily sending personal details.

Privacy requirements should be reviewed before public launch.

---

# 26. Registration metrics vs usage metrics

The application should distinguish:

**Visitors**

People who reach the site.

**Players**

People who actually start a game.

**Engaged players**

People who complete meaningful gameplay.

**Registered players**

People who create an account.

**Returning players**

People who return on another session/date.

This provides a much better picture of product adoption than registered-user count alone.

---

# 27. Suggested routing

Keep routing relatively small.

```text
/             Landing page
/play         Choose Learning Mode or Play Without Help
/game         Active game
/login        Login
/register     Create account
/account      Account/profile
/reset        Password reset
```

A separate `/learn` section can be added when worthwhile educational material exists.

Do not create routes for future Mahjong variants.

---

# 28. `/play` experience

Because there are only two real choices, `/play` should remain very simple.

Suggested presentation:

# How would you like to play?

### Learning Mode
**Recommended for newer MCR players**

Get strategy, hand-development and scoring guidance while you play.

**Select**

### Play Without Help

Play the same MCR game without strategic hints or recommendations.

**Select**

Then:

**Start Game**

Alternatively, selecting a mode can immediately start the game if this feels more natural.

There is no need to ask the user to select:

- Mahjong variant — MCR is the only variant.
- Game type — solo is the only current mode.

Do not make people confirm choices that are not actually choices.

---

# 29. Returning-player optimisation

Store the player's most recently used assistance mode.

A returning registered player with no unfinished game can therefore see something such as:

**Start Learning Mode**

with a smaller:

**Change mode**

option.

Guest preferences may be stored locally.

---

# 30. Responsive and iPad requirements

The application must be tested specifically on iPad Safari.

Important requirements include:

- Portrait and landscape layouts.
- Minimum approximately 44px touch targets.
- Safe-area handling.
- Correct browser back behaviour.
- Prevention of accidental loss of game state.
- Resume after Safari refresh.
- Resume after browser/tab closure where storage remains available.
- No hover-dependent controls.
- Keyboard accessibility for desktop users.
- Appropriate focus states.
- Readable text without browser zoom.
- No important buttons hidden behind Safari browser chrome.

---

# 31. Accessibility

The landing and account areas should aim for basic accessible web practices from the beginning.

Include:

- Semantic headings.
- Labelled form fields.
- Keyboard navigation.
- Visible focus.
- Appropriate colour contrast.
- Alternative text for meaningful images.
- Error messages associated with relevant fields.
- Buttons that describe their action clearly.

Mahjong tile accessibility is a broader game-level issue and is outside the immediate landing-page implementation unless existing components are modified.

---

# 32. Error handling

Account and saving failures must be handled explicitly.

Examples:

## Save failure

If cloud saving fails:

- Keep the game running.
- Preserve a local recovery copy where possible.
- Show a non-blocking warning.
- Retry appropriately.

The user should never lose a hand merely because the network briefly disappeared.

## Login failure

Show a clear generic message without unnecessarily revealing whether a particular email address exists.

## Restore failure

If a saved game cannot be loaded:

- Do not crash.
- Keep the saved data until the situation is understood.
- Explain that the game could not be restored.
- Provide a safe way to start another game.

---

# 33. Data-security requirements

If Supabase is used:

- Enable row-level security.
- Users must only access their own game sessions and profile data.
- Do not store passwords yourself.
- Do not expose privileged Supabase keys in the frontend.
- Use the authentication provider's supported session mechanisms.
- Do not put security logic solely in React/UI checks.
- Validate any server-side writes appropriately.

Security configuration should be tested rather than assumed.

---

# 34. Privacy and legal

Before public release, provide at least:

- Privacy policy.
- Terms of use.
- Contact/feedback route.

The privacy policy should explain, at minimum:

- What account information is stored.
- What gameplay information is stored.
- What analytics information is collected.
- Why it is collected.
- How users can request deletion where applicable.

Do not overbuild legal functionality during development, but do not launch publicly with invisible data collection.

---

# 35. Parallel development boundary

This work is intended to be capable of proceeding while scoring-engine development continues separately.

## Landing/account workstream may own

- Landing-page components.
- Header/footer.
- Authentication UI.
- Supabase client/service layer.
- Account area.
- Routing.
- Game-mode selection UI.
- Analytics integration.
- Local persistence infrastructure.
- Cloud persistence infrastructure.
- Resume-game UI.
- Game-save orchestration.

## Scoring/game-engine workstream owns

- MCR scoring.
- Fan identification.
- 8-point validation.
- Winning-hand validation.
- Shanten.
- Outs.
- Recommended-discard calculations.
- Hint reasoning.
- Bot strategy.
- Tile/game rules.
- Game reducer/state transitions.
- Meld legality.
- Turn sequencing.

The landing-page/account workstream must **not rewrite or independently implement Mahjong logic**.

---

# 36. Required interface between the workstreams

The main coordination point should be persistence.

The game workstream needs to provide or support:

```ts
serializeGameState()
restoreGameState()
```

or an equivalent clean interface.

The account workstream then decides whether that state is stored:

- locally for guests, or
- in Supabase for registered users.

This separation is important.

Cloud-storage code should not need to know how MCR scoring works.

MCR scoring code should not need to know how Supabase works.

---

# 37. Git / parallel-working recommendation

If Claude and Codex are working simultaneously:

- Use separate branches/worktrees.
- Avoid allowing both agents to make broad refactors to application entry points at the same time.
- Agree ownership of shared files before implementation.
- Keep the persistence interface small.
- Merge frequently enough that the branches do not diverge dramatically.
- Do not allow the landing-page branch to "clean up" unrelated scoring/game files.

If a shared application-root or router file must change, keep that change as small as practical.

---

# 38. Suggested implementation phases

## Phase 1 — Application shell

- Add/confirm routing.
- Create landing page.
- Create `/play`.
- Connect Start Game to the existing MCR game.
- Support Learning Mode and Play Without Help configuration.

No scoring-engine changes.

## Phase 2 — Local game persistence

- Define serialisable saved-game structure with game-engine owner.
- Autosave locally.
- Detect unfinished local game.
- Resume unfinished game.
- Handle refresh/back navigation safely.

## Phase 3 — Authentication

- Add Supabase behind service layer.
- Registration.
- Login.
- Logout.
- Password reset.
- Basic account page.

## Phase 4 — Cloud saves

- Create database schema.
- Add RLS.
- Save active registered-user game.
- Restore active game.
- Guest-to-account migration.
- Cross-device resume.

## Phase 5 — Analytics

- Instrument key funnel and gameplay events.
- Validate that anonymous and registered use can both be measured.
- Avoid collecting unnecessary personal data.

## Phase 6 — Polish and launch readiness

- iPad testing.
- Responsive testing.
- Accessibility checks.
- Error/recovery testing.
- Privacy/terms.
- Performance check.
- Authentication security review.

---

# 39. Acceptance criteria

The first release is successful when all of the following are true.

### Landing page

- A new visitor can understand that the application teaches MCR Mahjong.
- MCR is clearly identified.
- No unsupported Mahjong variants are advertised as imminent.
- The primary CTA starts the playing journey immediately.

### Modes

- Learning Mode works.
- Play Without Help works.
- No future/disabled modes clutter the experience.

### Guests

- A guest can play without registering.
- An unfinished game survives normal browser refresh/reopen on the same device where browser storage remains intact.
- A guest can resume the unfinished game.

### Accounts

- A player can register.
- A player can log in and out.
- Password reset works.
- A registered player's unfinished game is stored in the cloud.
- A registered player can resume on another device after logging in.

### Migration

- A guest who registers does not lose the unfinished game.
- Local game state is retained until cloud migration succeeds.

### Saving

- Game state is automatically saved.
- Refreshing during a game does not normally destroy the game.
- Temporary network failure does not destroy the game.
- Old/incompatible state is detected safely.

### Security

- One user cannot retrieve another user's saved game.
- Authentication secrets are not exposed.
- Row-level security is enabled and tested.

### Analytics

It is possible to determine:

- Number of visitors.
- Number of games started.
- Number of games/hands completed.
- Learning Mode usage.
- Without Help usage.
- Registrations.
- Returning users.
- Saved games resumed.

### Platform

- Landing page and account flow work on supported desktop browsers.
- They work on iPad Safari in portrait and landscape.
- Back navigation does not unexpectedly destroy an active game.

---

# 40. Future roadmap — intentionally not promised on landing page

Potential future enhancements may include:

- More sophisticated Learning Mode explanations.
- Post-game review.
- Replay.
- Practice/training exercises.
- Detailed statistics.
- Additional Mahjong variants.
- Multiplayer.
- Private games.
- Rankings.
- PWA/offline play.

These are roadmap possibilities, not commitments.

The initial site should therefore concentrate on one message:

> **Learn Chinese Official Mahjong by playing it, with as much or as little help as you want.**

---

# 41. Guiding implementation principle

Keep the first release focused.

The architecture should not prevent future growth, but future hypothetical requirements should not determine the design of the current application.

The initial product is:

**MCR Mahjong + computer opponents + Learning Mode + Play Without Help + accounts + automatic save/resume + basic analytics.**

Everything else can be justified later by actual player usage.