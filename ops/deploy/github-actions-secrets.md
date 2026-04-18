# GitHub Actions — required secrets

`.github/workflows/ci.yml` runs lint + typecheck + test + production builds on every PR and on `main` pushes. Three secrets are optional-but-recommended; without them the RLS leakage suite in `apps/web/tests/` skips with a console warning and CI still exits green.

Add them at **GitHub repo → Settings → Secrets and variables → Actions → New repository secret**.

| Secret | Value | Where to copy from |
|---|---|---|
| `TEST_SUPABASE_URL` | `https://idxgcrwikmcuqrrxbogj.supabase.co` | Literal — this is the `arcadia-test` project URL. |
| `TEST_SUPABASE_ANON_KEY` | Long `eyJhbGc…` JWT | Supabase dashboard → **arcadia-test** project → Settings → API → **`anon` public** key. |
| `TEST_SUPABASE_SERVICE_KEY` | Long `eyJhbGc…` JWT (different from anon) | Same page → **`service_role` secret** key. *Do not paste this anywhere but the GitHub secrets UI and your local `apps/web/.env.test.local`.* |

**Never put any Supabase key into a commit, a PR description, or a chat window.** Rotate immediately at Supabase dashboard → Settings → API → Reset service role key if a leak is suspected.

The Phase 0 production project (`arcadia`, ref `eqbzltiasmuckgsapkye`) is **not** a legitimate target for these secrets. `apps/web/tests/helpers.ts` hard-blocks that ref to prevent accidental destructive runs against live data.

## Verifying

Once added, trigger CI by pushing any commit to `main` or opening a PR. In the run's logs under the **Vitest** step look for `(13 tests | 13 skipped)` disappearing — it should read something like `(13 passed)` instead. If the RLS suite fails, read the assertion message; it'll name which policy leaked.

## Branch protection (optional, recommended before Phase 1 ships)

GitHub → Settings → Branches → Add rule for `main`:

- ☑ Require status checks before merging → add `format · lint · typecheck · test`
- ☑ Require branches to be up to date before merging

This stops anyone (including Claude) from pushing directly to `main` with a red CI. The Phase 0 debug loop happened via direct pushes; once CI is reliable this gate keeps the repo honest.
