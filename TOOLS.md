# TOOLS.md — Command & API Surface for Perennial

## just Recipes

| Recipe | What it does | When to run |
|---|---|---|
| `just` | Lists all recipes | Orientation |
| `just setup` | `corepack enable` + `pnpm install` | First clone; after lockfile changes |
| `just dev` | Starts the Next.js dev server (workspace `pnpm dev`) | Daily development |
| `just db-up` | `docker compose up -d postgres` (pgvector/pg16) | Before `migrate`, `dev`, or `test` needing a DB |
| `just db-down` | Stops the compose stack | Cleanup |
| `just migrate` | Runs Drizzle migrations from `packages/db` | After schema changes; after `db-up` on a fresh volume |
| `just test` | Vitest unit tests across all packages | Before every commit (TDD loop) |
| `just e2e` | Playwright end-to-end tests against the web app | Before merging UI/flow changes |
| `just lint` | ESLint across the workspace | Before commit |
| `just format` | Prettier write | When the format hook hasn't already done it |
| `just typecheck` | `tsc --noEmit` in all packages | Before commit |
| `just build` | Production build (web app + packages) | Before merging; release checks |
| `just ci` | lint + typecheck + test + build | Final gate; mirrors GitHub Actions |

The workspace is bootstrapped (M0); all recipes are live. `just migrate` fails fast with a
named-var error unless `DATABASE_URL` is set; unit tests and the build need no database.

## External Data Sources & APIs

| Source | Use | Auth env var | Rate/cost notes | Link |
|---|---|---|---|---|
| arXiv OAI-PMH + RSS | Primary preprint ingestion (ML/CS v1) | — | Free; 1 req/3s politeness; harvest nightly | https://info.arxiv.org/help/oa/ |
| OpenAlex | Canonical paper/citation backbone, metadata enrichment | `OPENALEX_MAILTO` (polite pool) | Free; 100K calls/day with mailto | https://docs.openalex.org |
| Semantic Scholar Graph API | Citations, embeddings (SPECTER), TLDRs | `SEMANTIC_SCHOLAR_API_KEY` | Free key 1 rps; request partnership tier for batch | https://api.semanticscholar.org |
| Crossref REST | **DOI existence verification (reference-integrity screen)** | `CROSSREF_MAILTO` (polite pool) | Free; use polite pool + backoff on 429 | https://api.crossref.org |
| Unpaywall | Locate legal OA PDFs only | `UNPAYWALL_EMAIL` | Free; 100K calls/day | https://unpaywall.org/products/api |
| bioRxiv API | Bio preprints (post-M1 expansion) | — | Free; paginated details endpoint | https://api.biorxiv.org |
| PubMed E-utilities | Biomed metadata/abstracts (post-M1) | `NCBI_API_KEY` | 3 rps keyless, 10 rps with key | https://www.ncbi.nlm.nih.gov/books/NBK25501/ |
| OpenReview API | Reviews/decisions for ML venues | — | Free; light use | https://docs.openreview.net |
| GROBID | PDF → structured text/refs (local service) | `GROBID_URL` | Self-hosted container; CPU-bound | https://github.com/kermitt2/grobid |
| Anthropic API (Batch + caching) | Initial synthesis + weekly integration (Sonnet-class); triage (Haiku-class) | `ANTHROPIC_API_KEY` | Batch = 50% off; caching mandatory; per-topic weekly budget cap | https://docs.anthropic.com |
| Voyage AI embeddings | Semantic dedup + relevance (pgvector) | `VOYAGE_API_KEY` | Cheap; batch nightly | https://docs.voyageai.com |
| Resend | Weekly delta digest email | `RESEND_API_KEY` | Per-email pricing; only send on real deltas | https://resend.com/docs |
| Inngest | Weekly per-topic cron pipelines, retry/replay | `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` | Free dev server locally | https://www.inngest.com/docs |
| Stripe (M3) | Billing: individual/pro/lab plans | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Standard fees | https://docs.stripe.com |

## Required Env Vars

| Name | Purpose |
|---|---|
| `DATABASE_URL` | Postgres + pgvector connection string |
| `ANTHROPIC_API_KEY` | Frontier synthesis/integration + cheap-model triage |
| `VOYAGE_API_KEY` | Embeddings for dedup/relevance |
| `SEMANTIC_SCHOLAR_API_KEY` | S2 Graph API key |
| `CROSSREF_MAILTO` | Crossref polite-pool contact (DOI verification) |
| `OPENALEX_MAILTO` | OpenAlex polite-pool contact |
| `UNPAYWALL_EMAIL` | Unpaywall API contact |
| `NCBI_API_KEY` | PubMed E-utilities rate boost (optional until bio expansion) |
| `GROBID_URL` | Local GROBID service base URL |
| `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` | Scheduler auth |
| `RESEND_API_KEY` | Delta digest delivery |
| `AUTH_SECRET` | Web app session signing |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Billing (M3 only) |

Never commit values. Validate presence at startup; fail fast with a named-var error.

## Local Services (docker compose)

- `postgres` — `pgvector/pgvector:pg16`, exposed on 5432, volume-backed. Start with `just db-up`.
- `grobid` — `lfoppiano/grobid:0.8.*` for PDF parsing (added when `packages/pipeline` lands).
- Inngest dev server runs via `npx inngest-cli dev` during `just dev` (no compose entry needed).

## CI Overview (`.github/workflows/ci.yml`)

- Triggers on every `push` and `pull_request`; runs on `ubuntu-latest`.
- Steps: checkout → `extractions/setup-just@v3` → Node 22 + corepack → **bootstrap guard**:
  if `package.json` is absent the job emits a notice and skips the build steps, keeping the
  docs-only scaffold green. Once bootstrapped: `pnpm install --frozen-lockfile` → `just ci`.
- A `pgvector/pgvector:pg16` service container is wired via `DATABASE_URL` for DB-backed
  tests; it is only exercised once the repo is bootstrapped.

## AI Harness Notes (`.claude/settings.json`)

- **PostToolUse hooks:** Prettier formats every written/edited `.ts/.tsx/.js/.jsx/.json/.css/.md`
  file; ESLint `--fix` runs on `.ts/.tsx`. Both no-op until `package.json` exists.
- **Stop hook:** `tsc --noEmit` runs at session end (once bootstrapped) — fix type errors
  before finishing, don't leave them for the hook to report.
- **Pre-approved commands:** `just`, `pnpm`, `node`, `npx vitest`, `npx playwright`,
  `docker compose`, read-only `git`. Prefer `just` recipes.
- **Useful subagents:** `tdd-guide` before new features (invariant tests first);
  `code-reviewer` immediately after changes; `security-reviewer` for auth, billing, and
  anything touching user data or external fetch paths; `build-error-resolver` if `just ci` breaks.
