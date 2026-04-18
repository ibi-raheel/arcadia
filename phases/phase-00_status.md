# Phase 0 — Status

Source plan: `phase-00_plan.md`. Status entries are chronological, newest at the top.

---

## 2026-04-18 — Phase 0 kickoff

**In flight:**

- Step 1 ✅ Stack ADR written at `planning/decisions/2026-04-18_locked-stack.md`. Promotes TAD §2 selections; documents rejected alternatives; notes CF Stream deferral to Phase 3.
- Step 2 🔄 Local git init pending. `gh auth login` (user-interactive) still needed before `gh repo create`.

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
