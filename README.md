# Perennial

> A literature review that never goes stale: subscribe to a research question and get a versioned, citation-verified survey that ingests each week's papers and flags which of its own claims are now supported, contradicted, or superseded — with every reference verified to actually exist.

**Category:** LLM wiki / auto-research (living documents + delta alerts, à la Karpathy) · **Status:** 🟡 Tier 2 — strong economics, must outrun ChatGPT/Perplexity feature-shipping

## Scorecard

| Metric | Score |
|---|---|
| Rank (of 12 finalists) | #8 |
| Combined score | 2.6 |
| Monetization potential (1-10) | 7 |
| Feasibility (1-10) | 6 |
| Defensible vs platform features | No |
| Skeptic verdict | weakened |

## Concept

A literature review that never goes stale: subscribe to a research question and get a versioned, citation-verified survey that ingests each week's papers and flags which of its own claims are now supported, contradicted, or superseded — with every reference verified to actually exist.

## Target User & Payer

PhD students, postdocs, lab PIs, and industry research scientists in fast-moving fields (ML, computational biology, neuro) drowning in arXiv's ~28K submissions/month. Individuals pay from personal or grant funds; PIs buy lab plans; adoption is viral within research groups because the shared review becomes the lab's canonical artifact.

## Auto-Research Mechanic (the living document + delta engine)

Seeded with a research question (optionally the user's own related-work draft), the agent generates a STORM-style structured survey with claim-level citations pinned to paper + section + quoted span. Then weekly maintenance: arXiv/OpenReview/bioRxiv/PubMed/Semantic Scholar deltas via RSS with semantic dedup; cheap-model triage filters AI-slop and citation-mill papers, including an integrity screen verifying every reference in a candidate paper resolves to a real DOI/arXiv ID — directly attacking the 1-in-277 fabricated-citation epidemic; a frontier pass integrates genuinely new results into affected sections only, marking existing claims newly supported / contradicted / superseded (Scite-style entailment applied to a living artifact, not retrospective lookup). Weekly delta email: '3 papers change Section 4; one contradicts the headline result you cite.' Full version history, per-claim provenance, verified BibTeX export.

## Product Surface

Web app — the living survey needs reading/diff UI — plus weekly email delta digest and BibTeX/Overleaf/Markdown export embedding it directly in the manuscript workflow.

## Why Now (2026 timing)

arXiv growth went super-exponential and arXiv banned unreviewed CS survey papers in Oct 2025 — survey demand is spiking exactly as human-authored supply is throttled. Fabricated citations rose 6x+ since 2023 with 100 fakes passing NeurIPS review, making 'every reference verified to exist and say what we claim' a marketable guarantee.

## Proposed Monetization

$19/mo individual (3 living reviews), $49/mo pro (10 topics + contradiction monitoring on the user's own published claims), $12/seat/mo lab plan (5-seat minimum), university site licenses as expansion. Matches the validated academic ceiling (Elicit $10-49, Scite $12-20, Consensus $15) while doing a job none of them do — maintenance, not one-shot search. COGS ~$2-4/user/mo (weekly cadence, batch, scholarly APIs free or cheap).

## Competition & Gap

Elicit (systematic-review screening, one-shot), Consensus (Q&A over papers), Scite (claim-level entailment but retrospective per-paper lookup, no living document), SciSpace, Semantic Scholar alerts (raw paper feeds, zero synthesis). All search; none maintain.

## Claimed Moat

The per-topic claim graph — thousands of entailment links between claims and papers built incrementally over months — cannot be recreated in any one-shot run and compounds with every weekly pass. Lab network effects: the shared review becomes onboarding and reference infrastructure. The anti-slop verification brand is structurally unavailable to ChatGPT/Gemini, which researchers correctly perceive as the slop source; the modest ARPU plus heavy editorial trust burden makes the niche unattractive for Big AI while being healthy SaaS for a small team.

---

# Evaluation (multi-agent adversarial review)

## Monetization Analysis — score 7/10

This scores well on all three special-attention criteria but is capped by the category's modest revenue ceiling. (a) Payer already pays for inferior alternative: verified — academics demonstrably pay $10-50/mo for one-shot tools (Elicit ~$18-22M est. ARR, 50K+ paying users; Scite 21K subscribers at $12-20/mo; Consensus revenue up 8x with a $30M round in 2025-26). None of these maintain a living artifact; all are search/lookup, so Perennial's 'maintenance, not search' wedge is real and the claimed competitive gap held up under search. (b) Churn: this is the candidate's structural strength. One-shot lit-review tools churn when the project ends (a plausible reason Scite plateaued near 21K subs after 4+ years). A versioned living survey with weekly deltas inverts that — the product gets MORE valuable with tenure because the claim graph compounds, and 'caught up' never arrives in fields adding ~28K arXiv papers/month. Residual churn risk is academic lifecycle (thesis submitted, postdoc ends) and grant-cycle budget fragility, which is real but mitigated by the lab plan owning the artifact rather than the individual. (c) Expansion: credible — individual → lab seats (shared review as lab onboarding infrastructure mirrors Overleaf's viral lab spread) → university site licenses (the exact B2C→B2B path Scite executed into a NASDAQ acquisition). The why-now is unusually well-evidenced: arXiv really did ban unreviewed CS surveys (Oct 2025), fabricated citations really did hit ~1-in-277 (10x in 3 years), and 100+ fake citations really passed NeurIPS 2025 review — making 'every reference verified to exist' a marketable, timely guarantee that ChatGPT/Gemini structurally cannot credibly claim since they are perceived as the slop source. What keeps it at 7 rather than 8-9: the category leader (Elicit) is only ~$20M ARR after years and heavy funding, ARPU is hard-capped by academic budgets, free alternatives (Semantic Scholar/Google Scholar alerts, bundled ChatGPT Deep Research at $20/mo researchers already pay) exert constant pressure on the low end, and frontier labs are rapidly improving citation grounding, which erodes the verification moat over a 3-5 year horizon. This is a healthy $3-15M ARR niche SaaS with a believable acquisition path (Research Solutions, Clarivate, Elsevier/Digital Science all acquire here), not a venture-scale outcome — exactly what the candidate's own moat section concedes.

## Recommended Revenue Model

Keep the proposed tiering but tune it: Free tier with 1 living review that freezes after 30 days without payment (the staleness itself is the upgrade trigger — uniquely well-suited to this product). Individual at $16-19/mo monthly / ~$144/yr annual (sits above Elicit Plus $10-12 and Scite $12-20, justified by ongoing maintenance vs one-shot; SciSpace's $70/mo Deep Review tier proves headroom above $20 exists for synthesis-grade output). Pro at $49/mo with own-claims contradiction monitoring — this feature targets PIs defending published results and is the strongest premium hook. Lab plan at $12/seat, 5-seat minimum ($720/yr floor) should be the primary go-to-market motion because the shared canonical review is the churn-killer and viral loop; price the artifact to the lab, not the person, so graduations don't churn the account. University site licenses at $5K-25K/yr as year-2+ expansion, following Scite's exact playbook (21K B2C subs → library deals → acquisition). Realistic trajectory at validated category economics: ~3-6K paying individuals plus 150-400 labs in 24 months ≈ $1.5-3.5M ARR (matches Scite's pace), with $10-15M ARR achievable if site licensing lands. COGS claim of $2-4/user/mo is plausible given weekly batch cadence and free scholarly APIs, supporting 80%+ gross margins.

## Market Evidence (live web research, June 2026)

Academic AI research-tool willingness-to-pay is proven at exactly the proposed price points: Elicit at an estimated $18-22M ARR (2025) with 50K+ paying users and $10-49/mo tiers after a $22M Series A; Consensus reported $1.5M ARR (Aug 2024), then 8x revenue growth and a $30M round led by GreatPoint Ventures (2025-26), now claiming 8M users; Scite was acquired by Research Solutions (NASDAQ: RSSS) in Nov 2023 at $3.6M ARR with ~21K B2C subscribers plus B2B/institutional contracts — establishing both the price floor and the exit comp. SciSpace charges $12-20/mo with an $8-18/seat team tier and a $70/mo Deep Review tier, demonstrating premium headroom; Undermind charges $16/mo. The why-now catalysts independently verified: arXiv stopped accepting unreviewed CS survey/position papers in Oct 2025 due to a flood of LLM-generated surveys (Decrypt, TheNextWeb); hallucinated-reference rates rose from ~1-in-2,828 (2023) to ~1-in-277 (early 2026), a 10x increase, with arXiv now imposing 1-year bans (Nature, byteiota); 100+ fabricated citations in 53 papers passed NeurIPS 2025 peer review. Demand-side context: ~5M new academic papers/year and ~49% of surveyed researchers spending ~4.5 hrs/day with papers (Zendy 2025). No incumbent found that maintains a living, versioned survey — Elicit/Consensus/SciSpace are one-shot, Scite is retrospective per-paper lookup, Semantic Scholar alerts are raw feeds with zero synthesis — so the claimed gap survived verification.

## Comparables

- Elicit — est. $18-22M ARR (2025), 50K+ paying users, tiers Free/$10-12 Plus/$42-49 Pro/Enterprise; $22M Series A; category leader and ARPU ceiling benchmark
- Scite — $3.6M ARR and ~21K B2C subscribers at acquisition by Research Solutions (NASDAQ: RSSS, Nov 2023); $12-20/mo individual; closest exit comp and B2C-to-site-license playbook
- Consensus — $1.5M ARR (Aug 2024), revenue up 8x within ~a year, $30M round led by GreatPoint Ventures, 8M users; $15ish/mo premium; proves fast growth is possible in this niche
- SciSpace — $12-20/mo Premium, $8-18/seat Teams, $70/mo Advanced Deep Review tier; proves premium-tier headroom above $20/mo for synthesis-grade output
- Undermind — $16/mo Pro, free tier 5 searches/mo; deep-literature-search adjacent comp
- Semantic Scholar / Google Scholar alerts — free; raw paper feeds with zero synthesis; the free-alternative pressure floor
- ChatGPT Deep Research / Gemini — ~$20/mo bundled; improving citation grounding is the main long-term moat threat, though currently perceived by researchers as the fabricated-citation source

## Adversarial Review — strongest case AGAINST (verdict: weakened)

The pitch survives the wrong enemy and dies to the right one. (1) MISIDENTIFIED COMPETITION: Frontier labs won't build versioned scholarly claim graphs — but Scite, Elicit, Consensus, and Ai2 will, and they already own the hard assets. Scite has 1.2B+ citation statements and a production entailment classifier; adding 'living document' on top is a quarter of work for them, while Perennial rebuilding Scite's corpus takes years. Ai2's Semantic Scholar/Asta is free and grant-funded, and academics are the most price-sensitive, free-tool-defaulting audience in SaaS. Meanwhile ChatGPT/Gemini/Perplexity already ship scheduled tasks + deep research + proactive briefings (ChatGPT Pulse), so for the marginal grad student a $20/mo subscription they ALREADY pay delivers 70% of the perceived value, capping conversion. (2) THE MOAT IS CONDITIONAL: the 'claim graph compounds over months' argument only holds if incremental maintenance measurably beats a weekly from-scratch regeneration by a 1M-token-context frontier model — unproven, and regeneration cost falls every quarter. Version history and lab embedding are real but small-N lock-in. The 'anti-slop brand structurally unavailable to Big AI' claim is already falsified: Perplexity markets 94.3% citation accuracy; DOI existence-checking is a free Crossref call anyone can ship. (3) TRUST BAR: existence verification is the trivial 10%; supported/contradicted/superseded entailment in the wild is the unsolved 90% (SciFact-class models run ~70-85% F1 on curated data, worse on real papers). The users are domain experts — the one audience guaranteed to catch every error. One false 'this contradicts your headline result' email to a PI's lab, or one missed major result the user's colleague mentions first, breaks the only promise ('never goes stale, every claim verified') the product makes. Tolerable error rate is <5% false alarms and near-zero missed major signals in the user's own niche — current entailment tech does not clear that bar without expensive human-in-the-loop. (4) COGS UNDERSTATED 2-4x: weekly frontier integration passes over a 50-100K-token survey plus 5-20 deep-read papers runs $0.50-2.00/topic/week even with batch+caching; a 3-topic $19 user with active topics costs $6-24/mo, not $2-4. Margins are 40-70%, not 85%+, and the $19 tier is underwater for power users. (5) DATA ACCESS CLIFF: ML/CS preprints are open, but comp bio and neuro live behind Elsevier/Springer/Wiley paywalls a startup cannot legally full-text mine; entailment on abstracts is unreliable, so the product silently degrades outside preprint-native fields — shrinking TAM to exactly the field (ML) where free alternatives are densest. (6) CHURN: academic lit-review need is bursty (pre-submission, pre-grant); mature topics produce 'nothing changed' weeks that teach the user to cancel; students graduate; realistic individual subscription lifetime is 4-9 months. Scite and Elicit both pivoted toward institutional/publisher revenue precisely because individual academic churn is structurally bad — Perennial's expansion path (site licenses) means 12-18 month university procurement cycles a seed-stage team may not survive.

## Recommended Tech Stack & Unit Economics

DATA: arXiv OAI-PMH/RSS + OpenReview API + bioRxiv API + PubMed E-utilities (all free); OpenAlex as the canonical paper/citation backbone (free); Semantic Scholar Academic Graph API (free key, partnership tier needed for rate limits); Crossref REST for DOI existence verification (free); Unpaywall for OA PDFs; GROBID for PDF-to-structured-text. MODELS: Stanford STORM (open-source) as the survey-generation skeleton; frontier model (Claude Sonnet 4.6-class) via Batch API + prompt caching for initial synthesis and weekly integration passes; Haiku 4.5/Gemini Flash-class for abstract triage and slop screening; embeddings (Voyage/OpenAI) + pgvector for semantic dedup and topic-relevance filtering; cheap fine-tuned cross-encoder (DeBERTa/SciFact-style) as first-pass entailment with frontier-model adjudication only on flagged claim-paper pairs — this two-stage design is the only way the entailment COGS and precision both work. ORCHESTRATION: Temporal or Inngest for weekly per-topic cron pipelines with retry/replay; Postgres for the claim graph (claims, papers, entailment edges, char-span provenance); ProseMirror + structured diffing for the versioned survey UI; Next.js web app; Resend for delta digests; BibTeX/Markdown/Overleaf export. UNIT ECONOMICS (realistic, not pitched): initial survey $3-8 one-time per topic; weekly maintenance per ACTIVE topic = triage ~$0.05 (300 abstracts x cheap model, batched) + integration pass $0.40-1.80 (cached survey context + 5-20 deep-read papers, frontier batch) = roughly $2-8/topic/month; assuming 1.5 active topics average per individual user, COGS $4-12/user/month against $19 = 40-75% gross margin, requiring hard caps on topic count, integration only on affected sections, and aggressive caching to stay viable. Crawling/legal COGS near zero if strictly preprint+OA; any paywalled full-text ambition adds licensing costs that break the model.

---

*Generated 2026-06-10 from a multi-agent research pipeline: 4/5 live-web research agents (product landscape, B2B intel market, tech economics, demand signals; the Karpathy-quotes agent stalled), 3-lens ideation (B2B radars, living wikis, prosumer auto-research), shortlist, then per-candidate monetization analyst + platform-risk skeptic. Market figures are agent-researched estimates — verify before committing capital.*
