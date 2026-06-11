import type { Citation, PaperRef, Section } from '@perennial/core';
import { createClaim } from '@perennial/core';
import { arxivBaseId } from './dedup';
import type { ReferenceResolver } from './integrity';
import type { DraftSection } from './synthesize';
import type { HarvestRecord } from './schemas';

/**
 * Deterministic binding of UNTRUSTED synthesis output to verified artifacts:
 * - every quoted span must be a verbatim substring of the source abstract (invariant 2);
 * - every citation must resolve right now, and the resolution is recorded (invariant 1);
 * - anything the model invented (unknown papers, paraphrased spans) is dropped and counted.
 */

export interface DroppedClaim {
  readonly paperBaseId: string;
  readonly reason: 'unknown_paper' | 'span_not_verbatim' | 'invalid_claim';
}

export interface BindResult {
  readonly sections: readonly Section[];
  readonly citations: readonly Citation[];
  readonly papers: readonly PaperRef[];
  readonly dropped: readonly DroppedClaim[];
  readonly citationsRejected: number;
}

function headingSlug(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function toPaperRef(record: HarvestRecord): PaperRef {
  return {
    id: arxivBaseId(record.arxivId),
    title: record.title,
    authors: record.authors.map((author) => author.name),
    year: Number(record.publishedAt.slice(0, 4)),
    doi: record.doi,
    arxivId: arxivBaseId(record.arxivId),
    fullTextStatus: record.oaPdfUrl === null ? 'abstract_only' : 'oa_fulltext',
  };
}

interface MutableBind {
  readonly sections: Section[];
  readonly citations: Citation[];
  readonly papers: Map<string, PaperRef>;
  readonly dropped: DroppedClaim[];
  citationsRejected: number;
}

function bindClaim(
  draft: DraftSection['claims'][number],
  record: HarvestRecord,
  resolver: ReferenceResolver,
  nowIso: string,
  state: MutableBind,
): ReturnType<typeof createClaim> | null {
  if (!record.abstract.includes(draft.quotedSpan)) {
    state.dropped.push({ paperBaseId: draft.paperBaseId, reason: 'span_not_verbatim' });
    return null;
  }
  const claimResult = createClaim({
    id: `claim-${draft.paperBaseId}`,
    text: draft.text,
    status: 'supported',
    provenance: {
      paperId: draft.paperBaseId,
      sectionLocator: 'abstract',
      quotedSpan: draft.quotedSpan,
    },
    confidence: record.oaPdfUrl === null ? 'abstract_only' : 'oa_fulltext',
  });
  if (!claimResult.ok) {
    state.dropped.push({ paperBaseId: draft.paperBaseId, reason: 'invalid_claim' });
    return null;
  }
  const identifier = record.doi ?? draft.paperBaseId;
  const resolution = resolver.resolve(identifier);
  if (resolution === null || resolution.httpStatus < 200 || resolution.httpStatus >= 300) {
    state.citationsRejected += 1;
    return null;
  }
  state.citations.push({
    id: `cite-${draft.paperBaseId}`,
    claimId: `claim-${draft.paperBaseId}`,
    paperId: draft.paperBaseId,
    doiOrArxivId: identifier,
    verification: {
      resolver: resolution.resolver,
      resolvedAt: nowIso,
      httpStatus: resolution.httpStatus,
    },
  });
  state.papers.set(draft.paperBaseId, toPaperRef(record));
  return claimResult;
}

export function bindDraftSections(
  drafts: readonly DraftSection[],
  records: readonly HarvestRecord[],
  resolver: ReferenceResolver,
  nowIso: string,
): BindResult {
  const recordsByBase = new Map(records.map((record) => [arxivBaseId(record.arxivId), record]));
  const state: MutableBind = {
    sections: [],
    citations: [],
    papers: new Map(),
    dropped: [],
    citationsRejected: 0,
  };

  drafts.forEach((draft, index) => {
    const claims = draft.claims.flatMap((draftClaim) => {
      const record = recordsByBase.get(draftClaim.paperBaseId);
      if (record === undefined) {
        state.dropped.push({ paperBaseId: draftClaim.paperBaseId, reason: 'unknown_paper' });
        return [];
      }
      const bound = bindClaim(draftClaim, record, resolver, nowIso, state);
      return bound !== null && bound.ok ? [bound.value] : [];
    });
    if (claims.length > 0) {
      state.sections.push({
        id: `section-${headingSlug(draft.heading)}`,
        heading: draft.heading,
        order: index + 1,
        prose: draft.prose,
        claims,
      });
    }
  });

  return {
    sections: state.sections,
    citations: state.citations,
    papers: [...state.papers.values()],
    dropped: state.dropped,
    citationsRejected: state.citationsRejected,
  };
}
