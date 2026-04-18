# Workspace: Ops

## Purpose

Deployment, infrastructure, monitoring, and operational scripts.

## Layout

- `/deploy` — deploy configs, CI/CD pipeline definitions, environment setup per target (dev, staging, prod).
- `/monitoring` — uptime, error tracking, performance monitoring configs, and incident runbooks.
- `/scripts` — one-off and recurring operational scripts (migrations, seed data, maintenance tasks).

## Process

- Every deploy target has a documented config. No undocumented environments.
- Every recurring operational task has a script, not a tribal-knowledge procedure.
- Incidents get a runbook entry after they happen so they resolve faster next time.

## What good looks like

- A new developer could deploy to staging by reading `/deploy` and running the documented commands.
- Monitoring catches issues before users do.
- Scripts are idempotent and safe to re-run.
- Every script has a header explaining what it does, when to run it, and any side effects.

## What to avoid

- **Secrets, keys, or tokens in any file in this repo.** Ever. Use the deploy target's secret store.
- Manual deploy steps that aren't documented.
- Scripts without a header.
- Monitoring configs without a matching runbook for the alerts they fire.

## Tooling

- **`schedule` skill** (installed) — wire any recurring `/scripts` job (cleanup, sync, backup) through this rather than cron-on-a-server.
- **scheduled-tasks MCP** (installed) — create / list / update the tasks the `schedule` skill produces.
- **GitHub MCP** (proposed) — CI/CD workflows, release tags, Actions runs.
- **Deploy target MCP** (proposed — Vercel / Cloudflare / Fly, per the deploy ADR) — deploy status, env var management, rollback.
- **Sentry MCP** (proposed) — error tracking. Wire in before first prod push.
- **PagerDuty MCP** or **Opsgenie MCP** (proposed) — incident alerting. Post-launch.
- **Mux MCP** or **Cloudflare Stream MCP** (proposed, per the video ADR) — upload/playback ops for course video.
