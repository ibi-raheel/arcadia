# `apps/web/lib/fixtures/`

Hand-authored mock fixtures used by the simulation toggle. One file per
surface, exporting a default value whose TypeScript type matches the
production data shape exactly.

Each data-fetching surface wraps its fetcher with `fetchOrMock` (server
components) or `useFetchOrMock` (client) from
`apps/web/lib/fetch-or-mock.ts`. When simulation mode is on, the helper
returns the fixture; otherwise it runs the real fetcher. See ADR 0010.

## Conventions

- Filename is kebab-case of the surface: `dashboard-studio.ts`,
  `academy-course.ts`, `market-stalls.ts`, etc.
- Types come from the same place the real fetcher gets its result type
  (usually Supabase-generated row types in `@/lib/supabase/database.types`
  or local types in the surface's feature folder).
- Values narrate a believable **"good state"** — showcase what the
  surface looks like when things are going well. If the surface has
  error / empty states worth showcasing, add additional named exports
  and let the surface pick which to render.
- No randomised / faker-generated data — fixtures are stable across
  reloads so visual regression and demo rehearsals are deterministic.

## Today

Empty. Fixtures are added as surfaces land in sub-phases 8.2–8.7.
