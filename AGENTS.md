# AGENTS.md — Operating Manual for Perennial

## Project Snapshot

**Perennial** is a living, citation-verified literature review SaaS. A researcher subscribes
to a research question and gets a versioned STORM-style survey that ingests each week's
papers (arXiv, OpenReview, bioRxiv, PubMed, OpenAlex) and marks its own claims as
**supported / contradicted / superseded** — with every reference verified to resolve to a
real DOI or arXiv ID.

- **Who pays:** PhD students and postdocs ($16–19/mo), PIs ($49/mo pro with own-claims
  contradiction monitoring), labs ($12/seat, 5-seat min — the primary GTM motion).
- **Status:** Tier 2 (strong economics, must outrun ChatGPT/Perplexity feature-shipping).
  This repo is currently a documentation + harness scaffold; no application code yet.

## Read First

1. `README.md` — research dossier: concept, market evidence, adversarial review. Binding context.
2. `DESIGN.md` — architecture, data model, milestones (M0–M3), risks. Build in milestone order.
3. `TOOLS.md` — every command, external API, env var, and CI behavior.

## Commands

`just` is the single source of truth. Agents must use these recipes, never raw
`pnpm`/`docker` invocations. All recipes fail with a helpful message until M0 bootstrap.

| Recipe | Purpose |
|---|---|
| `just` | List recipes |
| `just setup` | corepack enable + pnpm install |
| `just dev` | Run the Next.js dev server |
| `just db-up` / `just db-down` | Start/stop local Postgres (pgvector) via docker compose |
| `just migrate` | Apply Drizzle migrations |
| `just test` | Vitest unit tests across the workspace |
| `just e2e` | Playwright end-to-end tests |
| `just lint` / `just format` | ESLint / Prettier |
| `just typecheck` | `tsc --noEmit` across packages |
| `just build` | Production build |
| `just ci` | lint + typecheck + test + build (what GitHub Actions runs) |

## Architecture Summary

pnpm workspace monorepo: deterministic ingestion feeds a Postgres+pgvector claim graph;
a weekly Inngest-scheduled pipeline runs cheap-model triage then frontier Batch-API
integration over affected survey sections only; the Next.js app renders versioned surveys
with diff UI and exports. Module map (must match `DESIGN.md`):

- `apps/web` — Next.js 15 (App Router, TypeScript strict): survey reader, diff UI, exports, billing.
- `packages/core` — pure TS domain logic: claim graph, entailment state machine, diffing, BibTeX.
- `packages/pipeline` — ingestion workers, triage, reference-integrity screen, Batch-API integration passes (Inngest functions).
- `packages/db` — Drizzle ORM schema + migrations for Postgres + pgvector.

## Coding Standards

- TypeScript strict everywhere; no `any` without an inline justification comment.
- Files < 800 lines, functions < 50 lines; organize by feature/domain, not by file type.
- Immutability by default: return new objects, never mutate inputs. Survey versions are append-only.
- Explicit error handling at every boundary (API clients, DB, queue handlers); never swallow
  errors; pipeline failures must surface in the `pipeline_run` record.
- Validate all external data at the boundary (zod schemas for every upstream API response).
- No hardcoded secrets — env vars only, validated at startup (see `TOOLS.md` table).
- Conventional commits: `feat:` `fix:` `refactor:` `docs:` `test:` `chore:`.

## Testing Policy

- TDD: write the failing test first (RED → GREEN → REFACTOR). Target 80%+ coverage.
- AAA pattern (Arrange–Act–Assert), descriptive behavior-named tests.
- What matters most for THIS product, in order:
  1. **Reference-integrity tests** — property/fixture tests proving no unverified citation
     can reach a rendered survey, export, or email. This is the brand promise.
  2. **Pipeline determinism tests** — given a fixed fixture of weekly papers, triage and
     diff output must be reproducible; LLM calls mocked with recorded fixtures.
  3. **Entailment-gating tests** — `contradicted` is unreachable without frontier
     adjudication + quoted evidence span.
  4. **Diff/versioning tests** — versions are immutable; diffs are exact.
  5. Playwright e2e for the topic → survey → diff → export journey.

## PRODUCT INVARIANTS (non-negotiable)

1. **No unverified references, ever.** Every citation rendered in a survey, delta email, or
   BibTeX/Overleaf export must have resolved to a real DOI (Crossref) or arXiv ID at write
   time, with the resolution recorded on the `citation` row. Render code must refuse
   unverified citations — enforce with a test that injects one and asserts rejection.
2. **Every claim carries pinned provenance:** paper ID + section + quoted span. A claim
   without provenance cannot be persisted (DB constraint + core-layer validation).
3. **Deterministic before LLM.** Feed parsing, dedup, DOI/arXiv resolution, version diffing,
   and BibTeX generation are deterministic code. An LLM never decides whether a reference
   exists or what changed between versions.
4. **Precision-biased entailment.** Two-stage only: cheap cross-encoder first pass; frontier
   adjudication solely on flagged claim–paper pairs. `contradicted` requires frontier
   confirmation plus quoted evidence from both sides; when uncertain, label `needs_review`
   and never email it as a contradiction. Tolerable false-alarm rate < 5% (README trust bar).
5. **Hard cost caps.** Weekly integration touches affected sections only; per-topic weekly
   model spend is capped by a named constant; all scheduled LLM work goes through the
   Anthropic Batch API with prompt caching. Per-run cost is recorded on `pipeline_run`.
6. **Preprint + OA full text only.** Fetch/store full text only from arXiv, OpenReview,
   bioRxiv, and Unpaywall-OA sources. Never fetch, store, or mine paywalled full text.
   Abstract-only evidence must be labeled lower-confidence in the UI.
7. **Published survey versions are immutable.** Edits create a new version; delta emails
   link a diff between two immutable versions. No in-place mutation of published content.
8. **Polite API citizenship.** Crossref/OpenAlex calls include the `mailto` identifier;
   respect documented rate limits; exponential backoff on 429; nightly batch windows for bulk pulls.
9. **Every scheduled run is auditable.** A weekly pass always writes a `pipeline_run` record
   (papers seen, triaged, integrated, cost, errors) — including "nothing changed" weeks.

## Definition of Done

- [ ] Failing test written first; now green; coverage ≥ 80% on touched code.
- [ ] `just ci` passes locally (lint + typecheck + test + build).
- [ ] No product invariant violated; new code paths that touch citations/claims have invariant tests.
- [ ] Errors handled at every boundary; zod validation on new external inputs.
- [ ] No secrets, no `console.log` debris, files < 800 lines, functions < 50.
- [ ] Conventional commit message; docs (`DESIGN.md`/`TOOLS.md`) updated if commands or architecture changed.
