# DESIGN.md — Perennial

## Thesis

Every literature-review tool on the market searches; none maintain. Perennial sells the
maintenance artifact: a versioned, citation-verified survey whose claim graph compounds
weekly, so the product gets more valuable with tenure while one-shot competitors reset to
zero. The marketable guarantee — "every reference verified to exist, every claim pinned to
a quoted span" — lands exactly as fabricated citations hit 1-in-277 and arXiv bans
unreviewed LLM surveys.

## Architecture

### Components

```
pnpm workspace (monorepo)
├── apps/web            Next.js 15 App Router, TS strict — reader, diff UI, exports, billing
├── packages/core       Pure TS domain logic — claim graph, entailment states, diff, BibTeX
├── packages/pipeline   Inngest functions — ingest, triage, integrity screen, integration
└── packages/db         Drizzle ORM — Postgres + pgvector schema and migrations
```

**Scheduler choice: Inngest** (not Temporal). Rationale: weekly per-topic crons with
retry/replay and step-level durability are exactly Inngest's sweet spot; it embeds in the
Next.js deployment (no separate cluster to operate), has a local dev server, and a
one-person team should not run Temporal infrastructure pre-revenue. Revisit Temporal only
if pipeline fan-out exceeds Inngest step limits (document the trigger in an ADR).

### Data Flow (source → diff → triage → synthesis → surface)

1. **Source (deterministic):** nightly harvest from arXiv OAI-PMH/RSS + OpenReview;
   OpenAlex enrichment as the canonical paper/citation backbone; Semantic Scholar for
   citation context; Unpaywall for OA PDFs; GROBID parses PDFs to structured text + refs.
2. **Diff/dedup (deterministic + embeddings):** new candidates vs. seen-set by
   DOI/arXiv ID, then semantic dedup via Voyage embeddings in pgvector.
3. **Triage (cheap model):** Haiku-class batch pass scores topic relevance and screens
   AI-slop; the **reference-integrity screen** (deterministic Crossref/arXiv resolution of
   every reference in a candidate paper) runs here — papers with fabricated references are
   flagged and down-ranked with the evidence attached.
4. **Synthesis (frontier, batched, cached):** weekly Anthropic Batch-API integration pass
   over **affected sections only**, with the survey context prompt-cached. Two-stage
   entailment: fine-tuned cross-encoder (SciFact-style) proposes claim–paper links; the
   frontier model adjudicates only flagged pairs and labels claims
   `supported / contradicted / superseded / needs_review` with quoted evidence spans.
5. **Surface:** new immutable `survey_version`; structured diff vs. previous version;
   delta digest email via Resend ("3 papers change Section 4; one contradicts the headline
   result you cite"); BibTeX/Markdown/Overleaf export.

### Cost Discipline (where each tier of compute is allowed)

| Tier | Used for | Never used for |
|---|---|---|
| Deterministic code | Feed parsing, DOI/arXiv resolution, dedup keys, version diffing, BibTeX, export | — |
| Embeddings + pgvector | Semantic dedup, topic relevance ranking | Claim labeling |
| Cheap model (Haiku-class, batch) | Abstract triage, slop screening, section-routing | Final entailment verdicts |
| Cross-encoder (fine-tuned) | First-pass claim–paper entailment candidates | Anything user-visible without adjudication |
| Frontier (Sonnet-class, Batch + caching) | Initial synthesis, weekly integration, entailment adjudication on flagged pairs only | Reference existence checks, diffing, dedup |

Per-topic weekly budget is a hard-capped named constant; cost per run is recorded on
`pipeline_run`. Target COGS: triage ~$0.05/topic/week + integration $0.40–1.80/topic/week
(README unit economics) — alert when a run exceeds 2x target.

## Data Model Sketch

- **user** — id, email, name, plan (`free/individual/pro/lab_seat`), lab_id?, created_at.
- **lab** — id, name, owner_user_id, seat_count, plan status; owns shared topics so
  graduations don't churn the artifact.
- **topic** — id, owner (user_id or lab_id), research_question, seed_draft?, field_scope
  (arXiv categories etc.), status (`active/paused/frozen`), weekly_budget_cents, cadence.
- **paper** — id, doi?, arxiv_id?, openalex_id?, title, authors, venue, published_at,
  abstract, oa_pdf_url?, full_text_status (`oa_fulltext/abstract_only`), integrity_flags
  (fabricated-reference findings), embedding (pgvector).
- **survey_version** — id, topic_id, version_number, created_by_run_id, immutable section
  tree snapshot, created_at. Append-only; published versions are never mutated.
- **section** — id, survey_version_id, heading, order, prose (ProseMirror doc), affected_by
  (paper ids in the last pass).
- **claim** — id, section_id, text, status (`supported/contradicted/superseded/needs_review`),
  provenance: source paper_id + section locator + quoted span (NOT NULL — DB-enforced).
- **citation** — id, claim_id, paper_id, doi_or_arxiv_id, verification: resolver
  (`crossref/arxiv`), resolved_at, http_status; render layer refuses rows without a
  successful resolution.
- **entailment_edge** — id, claim_id, paper_id, stage1_score, frontier_verdict?, evidence
  spans (both sides), decided_at; the compounding moat — never deleted, only superseded.
- **pipeline_run** — id, topic_id, week, counts (seen/deduped/triaged/integrated),
  cost_cents, model_versions, status, error?; written even for "nothing changed" weeks.
- **delta_digest** — id, topic_id, from_version → to_version, summary, sent_at, open/click.

## Key Flows

### 1. Create a topic → initial survey
1. User submits a research question (optionally pastes their related-work draft as seed).
2. `packages/pipeline` retrieves candidates (arXiv + OpenAlex + S2), dedups, triages.
3. STORM-style outline → section drafting via frontier Batch API; every drafted claim must
   bind to a paper + quoted span or it is dropped.
4. Reference-integrity pass: each citation resolved against Crossref/arXiv; failures block render.
5. `survey_version` v1 persisted; reader UI shows claims with hoverable provenance.

### 2. Weekly maintenance pass (the product)
1. Inngest cron fires per active topic; harvest deltas since last run.
2. Dedup → cheap-model triage → integrity screen on surviving candidates.
3. Cross-encoder proposes claim–paper entailment pairs; frontier adjudicates flagged pairs.
4. Integration pass rewrites only affected sections; new immutable `survey_version`.
5. Structured diff computed deterministically; `delta_digest` emailed only if material
   changes exist ("nothing changed" weeks are logged, not emailed — but surfaced in-app as
   "verified current as of <date>" so quiet weeks build trust instead of teaching churn).

### 3. Read a delta
1. Email links to the diff view: side-by-side or tracked-changes mode between two versions.
2. Status chips on changed claims (`contradicted` always shows both quoted evidence spans).
3. One-click: accept into reading list, open paper PDF (OA only), or mark `needs_review`
   resolution — feedback that tunes future triage.

### 4. Export to manuscript
1. User exports BibTeX / Markdown / Overleaf from any pinned version.
2. Export embeds only verified citations; the BibTeX is generated deterministically from
   `citation` rows, never from model output.
3. Export footer records survey version + verification date — the shareable trust artifact.

### 5. Free-tier freeze → upgrade (M3)
1. Free tier: 1 living review; after 30 days unpaid, the topic freezes (status `frozen`).
2. Frozen survey stays readable with a banner: "12 relevant papers since this froze."
3. The staleness counter is the upgrade trigger; checkout unfreezes and backfills the gap.

## Product & Visual Design Direction

**Annotated manuscript.** The UI should feel like a beautifully typeset working paper that
a careful reviewer has marked up — not a dashboard. Warm paper ground
(`oklch(97% 0.01 90)`), near-black ink text, generous measure (~68ch) for survey prose.
Typography: **Source Serif 4** for survey body and headings (scholarly, screen-tuned),
**IBM Plex Sans** for UI chrome, **IBM Plex Mono** for identifiers (DOIs, arXiv IDs).
Claim-status colors are semantic and restrained, used as margin marks and underlines, not
fills: supported = deep green `oklch(55% 0.12 150)`, contradicted = vermilion
`oklch(55% 0.18 30)`, superseded = amber `oklch(70% 0.13 80)`, needs-review = slate.
Diffs render as proofreader's tracked changes (strikethrough + margin annotations), and
provenance popovers look like footnotes. Depth comes from layered paper surfaces (subtle
shadow, 2px radius max), never glassmorphism. Dark mode later; light is the product.

## Milestones

### M0 — Bootstrap (make `just ci` green)
- pnpm workspace with the four packages stubbed; TS strict; ESLint + Prettier; Vitest +
  Playwright configured; docker compose with `pgvector/pgvector:pg16`; Drizzle baseline
  migration (user, topic, paper, survey_version, claim, citation, pipeline_run).
- **Accept:** `just setup && just db-up && just migrate && just ci` all succeed locally;
  GitHub Actions runs `just ci` green on a PR.

### M1 — Thin vertical slice (ML/arXiv only, one topic, no cron)
- Flow 1 end-to-end for a single hardcoded-field topic: question in → arXiv/OpenAlex
  retrieval → triage → STORM-style synthesis → verified `survey_version` v1 rendered in the
  reader with claim provenance popovers and BibTeX export.
- **Accept:** Playwright e2e creates a topic and renders a survey where 100% of citations
  have `citation.resolved_at` set; an injected fake DOI fixture is rejected before render;
  initial survey cost recorded and ≤ $8 (README budget).

### M2 — Trust layer (the weekly engine)
- Inngest weekly cron (Flow 2): dedup, triage, reference-integrity screen, two-stage
  entailment, affected-sections-only integration, immutable versioning, diff UI (Flow 3),
  Resend delta digest, per-run cost telemetry.
- **Accept:** on a frozen fixture corpus the pipeline is reproducible run-to-run; golden
  entailment set shows < 5% false-alarm rate for `contradicted` before digest email ships;
  property test proves no render/export/email path accepts an unverified citation;
  `pipeline_run` rows exist for no-change weeks.

### M3 — Monetization wiring
- Stripe: free (1 frozen-after-30-days review), individual $19/mo (3 topics), pro $49/mo
  (10 topics + own-claims contradiction monitoring), lab $12/seat (5-seat min, lab owns
  topics). Topic caps and freeze logic enforced in `packages/core`, not the UI.
- **Accept:** e2e covers checkout → entitlement → topic cap → freeze → unfreeze-backfill;
  webhook signature verification tested; downgrade paths never delete claim-graph data.

## Risks & Mitigations (from the adversarial review)

| # | Risk | Mitigation |
|---|---|---|
| 1 | **Incumbents (Scite/Elicit/Ai2) bolt "living document" onto existing corpora** | Wedge on the maintenance artifact + lab workflow: Overleaf/BibTeX embedding, lab-owned canonical reviews, version history. Ship the compounding `entailment_edge` graph from M2 — months of weekly passes are not recreatable in a one-shot run. Stay fast in the preprint-native ML niche they underserve. |
| 2 | **Entailment precision below the expert-user trust bar (false "contradicted" alarms)** | Invariant 4: two-stage design, precision-biased thresholds, `needs_review` instead of guessing, quoted evidence on both sides for every contradiction, golden-set gate (< 5% false alarms) before any digest email mentions a contradiction. |
| 3 | **COGS 2–4x understated; $19 tier underwater for power users** | Hard per-topic weekly budget constant, affected-sections-only integration, mandatory Batch API + prompt caching, topic auto-pause on sustained no-delta weeks, cost-per-run telemetry from M2 day one, topic caps per plan enforced in core. |
| 4 | **Data-access cliff outside preprint-native fields (paywalled bio/neuro full text)** | Scope v1 to ML/CS (arXiv/OpenReview). Invariant 6: OA-only full text; abstract-only evidence visibly labeled lower-confidence. Expand to bioRxiv/PubMed-OA second; treat paywalled fields as out of scope until licensing exists. |
| 5 | **Bursty academic demand + graduation churn; "nothing changed" weeks teach cancellation** | Lab plan as primary GTM (lab owns the artifact, not the graduating student); free-tier staleness counter as the upgrade trigger; quiet weeks reframed as "verified current as of <date>" trust signal; annual pricing default; pro-tier own-claims monitoring as the PI sticky hook. |
