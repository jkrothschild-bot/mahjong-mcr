# Product shell setup

This covers the landing page, authentication, save/resume and analytics
workstream. Mahjong rules and scoring remain entirely in the engine.

## Environment

Copy `packages/ui/.env.example` to `packages/ui/.env.local` and set:

```text
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
```

The anon key is designed for browser use with RLS. Never put a service-role
key in a Vite variable or frontend code. Without these values the app still
builds and guest play works; account forms show an actionable configuration
message.

## Supabase database

Create a Supabase project and apply
`supabase/migrations/202608070001_landing_auth_persistence.sql` using the
Supabase CLI or SQL editor. It creates minimal profiles, versioned game
sessions, insert-only client telemetry and ownership policies.

## RLS verification

Use two non-production test accounts, A and B.

1. Log in as A and create a profile/game session with A's UUID.
2. Confirm A can select and update those rows.
3. Using B's authenticated session, select A's UUID/session ID. The result
   must be empty.
4. Using B, insert or update a row whose `user_id` is A. It must fail with an
   RLS policy error.
5. Confirm anonymous and authenticated clients can insert a minimal analytics
   event, but cannot select from `analytics_events`.

The policies use `(select auth.uid())` and explicitly target authenticated or
anonymous roles. React route protection is convenience only; RLS is security.

## Authentication redirects

In Supabase Authentication → URL Configuration, set the Site URL to the final
deployment origin and allow these redirect patterns:

```text
https://YOUR_DOMAIN/mahjong-mcr/account
http://localhost:5173/mahjong-mcr/account
```

The production domain is still an owner decision. Email verification and
password recovery return to the account route; recovery mode presents the
new-password form.

## Save and recovery behaviour

- Guests use `mcr-mahjong:active-game:v1` in localStorage.
- Registered users write a local recovery copy before attempting Supabase.
- Cloud errors never block play; the game shows a local-recovery status.
- Guest migration uploads and reads back the same session ID before marking
  the browser copy as account-owned.
- Completed sessions remain cloud history but are not resumable.
- Restart/start-new marks the previous cloud session abandoned.

To test guest resume: start a game, discard a tile, refresh `/game`, and
confirm the turn, hand, wall, discards, match scores and replay log resume.
Corrupt or change the schema version in storage and confirm `/game` redirects
safely to `/play`.

## SPA deployment

Vite is configured under `/mahjong-mcr/`. The build copies `index.html` to
`404.html`, giving GitHub Pages a fallback while preserving the pathname for
BrowserRouter. Other hosts need an equivalent rewrite to `index.html`.

## Dependency advisory

`npm audit --omit=dev` currently reports
[GHSA-qwww-vcr4-c8h2](https://github.com/advisories/GHSA-qwww-vcr4-c8h2)
through `react-router-dom@7.18.2`. The advisory applies only to React Router's
unstable React Server Components mode; this app uses the declarative browser
router and does not import or enable the RSC APIs. The patched router core is
not yet available through a compatible `react-router-dom` release. Keep the
browser package on its latest compatible version and upgrade when a patched
DOM package is published.

## Pre-launch owner checks

- Validate the RLS procedure above against the live Supabase project.
- Configure the final production origin and authentication redirects.
- Approve the privacy, terms and feedback wording and contact details.
- Run a final interaction check on a physical iPad in both orientations.

## Analytics and privacy

Analytics uses a random locally persisted visitor ID and no fingerprinting.
Events contain internal IDs and small product properties, not email, names or
hand contents. Client telemetry is untrusted and may be spammed; never use it
for security or financial logic. Final privacy policy, terms and feedback
wording require owner approval before public launch.
