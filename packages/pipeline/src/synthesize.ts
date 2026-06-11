import { arxivBaseId } from './dedup';
import type { HarvestRecord, TopicFixture } from './schemas';

/**
 * STORM-style synthesis. The frontier model lives behind `SynthesisModel`;
 * CI runs only the deterministic mock. Model output is UNTRUSTED: the
 * deterministic binding layer (bind.ts) re-verifies every quoted span and
 * citation before anything reaches a survey version.
 */

export interface DraftClaim {
  readonly paperBaseId: string;
  readonly text: string;
  readonly quotedSpan: string;
}

export interface DraftSection {
  readonly heading: string;
  readonly prose: string;
  readonly claims: readonly DraftClaim[];
}

export interface SynthesisSectionInput {
  readonly heading: string;
  readonly papers: readonly HarvestRecord[];
}

export interface SynthesisResult {
  readonly sections: readonly DraftSection[];
  readonly costCents: number;
  readonly modelVersion: string;
}

export interface SynthesisModel {
  synthesize(topic: TopicFixture, sections: readonly SynthesisSectionInput[]): SynthesisResult;
}

export const MOCK_SYNTHESIS_MODEL_VERSION = 'mock-synthesis-v1';
export const MOCK_SYNTHESIS_COST_CENTS_PER_SECTION = 75;

/** Splits into sentences whose text is always a verbatim substring of the input. */
function sentences(text: string): readonly string[] {
  return text.split(/(?<=\.)\s+/);
}

function digitCount(sentence: string): number {
  return (sentence.match(/\d/g) ?? []).length;
}

/** Picks the most evidence-dense (digit-heavy) sentence; ties go to the earliest. */
export function pickEvidenceSpan(abstract: string): string {
  const parts = sentences(abstract);
  let best = parts[0] ?? abstract;
  for (const part of parts) {
    if (digitCount(part) > digitCount(best)) {
      best = part;
    }
  }
  return best;
}

function authorLabel(record: HarvestRecord): string {
  const first = record.authors[0]?.name ?? 'Unknown';
  const lastName = first.trim().split(/\s+/).at(-1) ?? first;
  return record.authors.length > 1 ? `${lastName} et al.` : lastName;
}

function draftClaim(record: HarvestRecord): DraftClaim {
  const span = pickEvidenceSpan(record.abstract);
  const year = record.publishedAt.slice(0, 4);
  return {
    paperBaseId: arxivBaseId(record.arxivId),
    text: `${authorLabel(record)} (${year}) report: ${span.replace(/\.$/, '')}.`,
    quotedSpan: span,
  };
}

/** Deterministic stand-in for the frontier Batch-API synthesis pass. */
export function createMockSynthesisModel(): SynthesisModel {
  return {
    synthesize(_topic, sections) {
      return {
        sections: sections.map((section) => ({
          heading: section.heading,
          prose: `${section.heading} — synthesized from ${section.papers.length} screened ${
            section.papers.length === 1 ? 'paper' : 'papers'
          }: ${section.papers.map((paper) => paper.title).join('; ')}.`,
          claims: section.papers.map(draftClaim),
        })),
        costCents: sections.length * MOCK_SYNTHESIS_COST_CENTS_PER_SECTION,
        modelVersion: MOCK_SYNTHESIS_MODEL_VERSION,
      };
    },
  };
}
