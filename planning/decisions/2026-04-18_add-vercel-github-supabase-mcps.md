# ADR 0002: Install Vercel, GitHub, and Supabase MCPs

- **Status:** Accepted
- **Date:** 2026-04-18
- **Deciders:** Arcadia build owner
- **Related:** `CLAUDE.md` §Tooling; ADR 0001 (locked stack)

## Context

Phase 0 requires driving three external systems: Supabase (schema + RLS),
Vercel (`/apps/web` deploy + env vars), and GitHub (repo, Actions,
secrets). Every Phase 1–5 step adds more per-service operations: env
var updates, deploy status checks, RLS rule edits, PR workflow tweaks,
rollbacks, preview URL lookups.

Today these are all user-driven via dashboards or CLI, which means:

- Every env var update requires the user as a relay.
- I cannot verify deploy status, inspect RLS, or read Actions logs
  without asking the user to paste output.
- Round trips dominate low-complexity tasks (e.g. "is the preview
  build green?" takes a screenshot exchange).

`CLAUDE.md` §Tooling already lists Vercel MCP, GitHub MCP, and
Supabase MCP as **proposed**. This ADR promotes three of them to
**installed** now, at the point of maximum downstream payoff, and
defers Railway MCP.

## Decisions

### Vercel — hosted HTTP MCP at `https://mcp.vercel.com`

Pre-installed as `plugin:vercel:vercel` (likely via a plugin bundle). OAuth-based; no PAT management. Authenticated by the user via
`/mcp` in Claude Code.

**Rejected alternatives:**
- Vercel CLI + Bash — still works as fallback but adds a process
  spawn per action and exposes token if passed via args.

### GitHub — hosted HTTP MCP at `https://api.githubcopilot.com/mcp/`

Installed via `claude mcp add --scope user --transport http github
https://api.githubcopilot.com/mcp/`. OAuth-based. Some tool surface
requires GitHub Copilot subscription; **fallback path** documented
below if that limits us.

**Rejected alternatives (for now):**
- `@modelcontextprotocol/server-github` stdio with PAT — kept as
  fallback. Swap in if hosted tool calls fail due to Copilot scope
  limits. We already have `gh` authenticated with `repo + workflow`
  scopes, so the PAT path is trivial to enable.

### Supabase — stdio MCP via `@supabase/mcp-server-supabase`

Installed via `claude mcp add --scope user supabase -- npx -y
@supabase/mcp-server-supabase@latest --read-only --access-token=<PAT>`.
User generates the PAT at <https://supabase.com/dashboard/account/tokens>
and supplies it at install time.

**`--read-only` is deliberate.** For Phase 0 the MCP's job is
inspection — confirm tables, RLS policies, signup trigger, and seed
row are as expected. Write access is not needed until (at earliest)
Phase 3, and even then `supabase db push` from CLI-managed migrations
is the canonical mutation path. Relaxing `--read-only` requires a new
ADR or an explicit in-session approval with scope.

**Rejected alternatives:**
- Supabase CLI only — works but doesn't expose RLS policies or row
  counts in a tool-friendly way.
- Raw `psql` with service-role password — more capability, more blast
  radius, and the service key in plain text in settings.json.

### Railway — deferred

Community Railway MCPs exist but none are as mature or widely
endorsed as the three above. For Phase 0's one-time Railway deploy
and the handful of env var updates in Phases 1–5, the dashboard + CLI
are sufficient. Re-evaluate if Railway touches more than ~6 times per
phase.

## Scope

| Workspace | Uses which MCP |
|---|---|
| `/apps/web` | Vercel (deploy + env), Supabase (schema inspection), GitHub (PR review, Actions logs) |
| `/apps/game-server` | GitHub only (Railway deploy stays CLI/dashboard) |
| `/packages/shared` | GitHub only |
| `/phases` | — |
| `/planning` | — |
| `/docs` | — |
| `/ops` | GitHub (workflow runs), Vercel (deploy history) |

## Consequences

### What this unlocks

- Vercel: I can list deploys, fetch build logs, update env vars, and
  trigger redeploys directly. No user relay.
- GitHub: PR review, issue triage, Actions log fetching, secret
  updates (within `gh` token scope).
- Supabase: I can read schema, verify RLS policies match `TAD §6.2`,
  confirm the signup trigger fired for a given user, and run the
  cross-member leakage test (Step 17) with richer assertions.

### What it costs

- Configuration lives in `~/.claude.json` (user-scoped). The Supabase
  PAT is stored there in plain text. Mitigation: user rotates the PAT
  if the machine is compromised; `--read-only` limits worst-case blast
  radius.
- Each Claude Code session must be restarted after install for the
  new MCPs to appear as `mcp__*` tools.
- One more OAuth dance for the user on first connect (Vercel, GitHub).

### Failure modes and fallbacks

- **GitHub hosted MCP is Copilot-gated on some endpoints.** If I hit a
  scope error, remove and reinstall as stdio:
  ```
  claude mcp remove github
  claude mcp add --scope user github -e GITHUB_PERSONAL_ACCESS_TOKEN=$(gh auth token) -- npx -y @modelcontextprotocol/server-github
  ```
- **Supabase MCP fails to npm-resolve.** Pin to a specific version in
  the install command (`@supabase/mcp-server-supabase@0.4.x` or
  whatever is current).
- **Any MCP is unreachable (network issue, Supabase outage).** Fall
  back to CLI (`supabase`, `vercel`, `gh`). All three CLIs are
  installed on the dev machine.

## Routing-table + CONTEXT.md updates (follow-up)

`CLAUDE.md` §Tooling lists these under "proposed" — they should move
to "installed now" on the next `/init` pass. Similarly, workspace
`CONTEXT.md` files under `/apps`, `/ops`, etc. can drop the
"(proposed)" suffix for the three installed MCPs. Not done in this
ADR; flagged here as mechanical follow-up to keep docs honest.

## Revisiting this decision

Open a new ADR if any of the following happens:

- Vercel MCP proves unreliable enough that we spend more time debugging
  it than using it. Fall back to Vercel CLI.
- GitHub hosted MCP's Copilot gate blocks workflow ops we need.
  Swap to stdio with PAT.
- We need write access to Supabase from within Claude (e.g. ad-hoc data
  fixes). Relax `--read-only` with an explicit scope statement in the
  new ADR.
- A Railway MCP reaches maturity. Install and update the routing table.
