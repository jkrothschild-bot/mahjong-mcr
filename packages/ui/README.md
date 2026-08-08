# MCR Mahjong Mentor UI

React/Vite product shell and game UI for MCR Mahjong Mentor.

## Local development

From the repository root:

```bash
npm install
npm run dev
```

Guest play, local autosave and resume work without backend configuration.
Copy `.env.example` to `.env.local` inside `packages/ui` to enable accounts,
cloud saves and Supabase-backed analytics.

See [`docs/product-shell-setup.md`](../../docs/product-shell-setup.md) for
Supabase setup, RLS verification, auth redirects, save/resume testing and SPA
deployment details.

## Quality gates

```bash
npm run typecheck
npm test
npm run build
npm run lint --workspace=@mahjong-mcr/ui
npm run test:e2e --workspace=@mahjong-mcr/ui
```
