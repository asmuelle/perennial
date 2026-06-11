import { arxivBaseId } from './dedup';
import type { HarvestRecord, OutlineHint, TopicFixture } from './schemas';

/**
 * Cheap-model triage (DESIGN.md tier table): topic relevance, slop screening,
 * and section routing. The model lives behind `TriageModel`; CI runs only the
 * deterministic mock. Triage NEVER decides whether a reference exists —
 * that is the deterministic integrity screen's job (invariant 3).
 */

export interface TriageDecision {
  readonly arxivBaseId: string;
  readonly relevant: boolean;
  readonly slop: boolean;
  readonly routedHeading: string | null;
  readonly keywordHits: readonly string[];
}

export interface TriageBatchResult {
  readonly decisions: readonly TriageDecision[];
  readonly costCents: number;
  readonly modelVersion: string;
}

export interface TriageModel {
  triage(records: readonly HarvestRecord[], topic: TopicFixture): TriageBatchResult;
}

export const MOCK_TRIAGE_MODEL_VERSION = 'mock-triage-v1';
export const MOCK_TRIAGE_COST_CENTS_PER_TEN_ABSTRACTS = 5;
const SLOP_MARKER_THRESHOLD = 3;

const SLOP_MARKERS: readonly string[] = [
  'groundbreaking',
  'revolutionary',
  'paradigm-shifting',
  'unprecedented',
  'game-changing',
  'seminal',
  'cutting-edge',
];

function hintHits(text: string, hint: OutlineHint): readonly string[] {
  return hint.keywords.filter((keyword) => text.includes(keyword.toLowerCase()));
}

function decideOne(record: HarvestRecord, topic: TopicFixture): TriageDecision {
  const text = `${record.title} ${record.abstract}`.toLowerCase();
  const slopCount = SLOP_MARKERS.filter((marker) => text.includes(marker)).length;
  const slop = slopCount >= SLOP_MARKER_THRESHOLD;

  let best: { heading: string; hits: readonly string[] } | null = null;
  const allHits: string[] = [];
  for (const hint of topic.outlineHints) {
    const hits = hintHits(text, hint);
    allHits.push(...hits);
    if (hits.length > 0 && (best === null || hits.length > best.hits.length)) {
      best = { heading: hint.heading, hits };
    }
  }

  return {
    arxivBaseId: arxivBaseId(record.arxivId),
    relevant: best !== null && !slop,
    slop,
    routedHeading: best?.heading ?? null,
    keywordHits: allHits,
  };
}

/** Deterministic stand-in for the Haiku-class batch triage call. */
export function createMockTriageModel(): TriageModel {
  return {
    triage(records, topic) {
      return {
        decisions: records.map((record) => decideOne(record, topic)),
        costCents:
          Math.ceil(records.length / 10) * MOCK_TRIAGE_COST_CENTS_PER_TEN_ABSTRACTS,
        modelVersion: MOCK_TRIAGE_MODEL_VERSION,
      };
    },
  };
}
