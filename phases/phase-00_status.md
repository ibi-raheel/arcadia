# Phase 0 — Status

Source plan: `phase-00_plan.md`. Status entries are chronological, newest at the top.

---

## 2026-04-18 — Phase 0 kickoff

**Done:**

- Step 1 ✅ Stack ADR written at `planning/decisions/2026-04-18_locked-stack.md`. Promotes TAD §2 selections; documents rejected alternatives; notes CF Stream deferral to Phase 3.
- Step 2 ✅ Git initialised (main), initial commit `007329a` (17 files, 2189 insertions), GitHub repo created at **https://github.com/ibi-raheel/arcadia** (private), origin pushed. Auth: `gh` as `ibi-raheel`, token scopes repo + workflow.
  - Noted: git auto-configured committer identity from hostname (`Aria <aria@Arias-Mac-mini.local>`). User can run `git config --global user.email <email>` at their leisure; not modified without permission.

- Step 3 ✅ Root monorepo chassis in place. Files: `package.json` (npm workspaces `apps/*` + `packages/*`, engine ≥ Node 20), `tsconfig.base.json` (strict TS 5, ES2022, bundler resolution, decorators enabled for Colyseus schemas), `.prettierrc.json` + `.prettierignore` (markdown excluded — hand-authored), `eslint.config.mjs` (flat config, TS rules), `vitest.workspace.ts` (per-workspace config discovery), `README.md`.
  - Gates pass locally: `npm run format:check` ✓, `npx eslint` ✓, `npx tsc --noEmit` ✓, `npm test` ✓ (passes with no tests yet via `--passWithNoTests`).
  - 158 dev dependencies installed.
  - Uncommitted on `main` — awaiting commit-cadence instruction from user.

**In flight:**

- Step 4 next — scaffold `/apps/web` (Next.js 14 App Router + Tailwind 3 + TypeScript 5 + Supabase client + health route).

**Environment status:**

- Node v24.15.0 LTS + npm 11.12.1 (via nvm)
- `gh` 2.90.0 and `supabase` 2.90.0 installed to `~/.local/bin`
- Mac Mini M4, macOS 26.2, Xcode CLT present
- Homebrew not installed — not required (all CLIs direct-downloaded)

**Blockers:**

- `gh auth login` — user must run via `! gh auth login` in next turn.
- Supabase project slugs — user to confirm `arcadia` and `arcadia-test` project refs when Step 7 begins.
- Google Cloud OAuth credentials — deferred until Step 15.

**Open risks (from plan §Risks):** item #4 (real mid-range laptop for final NFR validation) unresolved — not blocking for Phase 0 exit, needs resolution before Phase 5 Loom.

**Scope decisions today:**

- CF Stream deferred Phase 0 → Phase 3 (user instruction).
- Mac Mini M4 as dev device; 60 FPS NFR validated via Chrome DevTools CPU 6× throttling as proxy.
- MVP UI desktop-only; sprites still @1x/@2x/@3x per `/docs/art/sprite-requirements.md`.
- Art produced in-house by user (not commissioned, not CC0 pack).

**Next:** git init locally, stage initial commit, wait on `gh auth login` before pushing.
