# Workspace: Phases

## Purpose

This is where the Arcadia build is sequenced. Work is phase-gated: no phase starts without a written plan, and no phase ends without its test criteria passing.

## What lives here

- `phase-NN_plan.md` — the plan for a phase, written **before** work begins
- `phase-NN_status.md` — running status log for the phase (what's done, what's broken, what's next)
- `roadmap.md` — optional, high-level ordering of phases. Add only when you need it.

## Plan format

Every `phase-NN_plan.md` follows the template from `REFERENCES.md`:

```
## Phase [X] Plan: [Name]

**Goal:** What this phase delivers
**Steps:**
1. Step one
2. Step two
3. ...
**Test criteria:** How we confirm it is working before moving on
**Risks / unknowns:** Anything that could go wrong or needs clarification
```

## Process

1. Before a phase begins, write `phase-NN_plan.md`.
2. Stop. Wait for confirmation.
3. Once approved, open `phase-NN_status.md` and log progress as you go.
4. When every step's test criteria pass, mark the phase complete in the status file.
5. Only then: start the next phase plan.

## What good looks like

- Plans are specific enough that another developer could execute them.
- Test criteria are concrete ("avatar renders at the correct isometric position and responds to arrow-key input within 50ms") — not vague ("rendering works").
- Status files flag blockers the moment they appear, not after the fact.

## What to avoid

- Starting work without a plan.
- Marking a step "done" without running the test.
- Plans longer than a single screen — if it's bigger, it's probably two phases.
- V2 concerns (custom worlds, sprite swapping) creeping into a V1 phase plan.

## Tooling

No skills or MCPs are wired into this workspace. Phase planning is deliberately tool-light — it's just English in markdown. If a phase plan references work in another workspace, use that workspace's tools when you switch in.
