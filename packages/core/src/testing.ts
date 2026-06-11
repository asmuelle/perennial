import { unwrap } from './result';
import { createClaim } from './claims';
import type { Citation, Claim, ClaimStatus, PaperRef, Section } from './types';

/** Shared deterministic builders for core tests. Not exported from the package index. */

export const TEST_RESOLVED_AT = '2026-06-08T00:00:00.000Z';

export function testClaim(overrides: Partial<Parameters<typeof createClaim>[0]> = {}): Claim {
  return unwrap(
    createClaim({
      id: 'claim-1',
      text: 'Deterministic screening flags 96.4% of fabricated references.',
      status: 'supported' as ClaimStatus,
      provenance: {
        paperId: 'paper-1',
        sectionLocator: 'abstract',
        quotedSpan: 'We show that a deterministic resolution pass flags 96.4% of fabricated references.',
      },
      confidence: 'oa_fulltext',
      ...overrides,
    }),
  );
}

export function verifiedCitation(overrides: Partial<Citation> = {}): Citation {
  return {
    id: 'cite-1',
    claimId: 'claim-1',
    paperId: 'paper-1',
    doiOrArxivId: '2602.04891',
    verification: { resolver: 'arxiv', resolvedAt: TEST_RESOLVED_AT, httpStatus: 200 },
    ...overrides,
  };
}

export function unverifiedCitation(overrides: Partial<Citation> = {}): Citation {
  return { ...verifiedCitation(), verification: null, id: 'cite-unverified', ...overrides };
}

export function testPaper(overrides: Partial<PaperRef> = {}): PaperRef {
  return {
    id: 'paper-1',
    title: 'CitationGuard: Detecting Fabricated References',
    authors: ['Mara Lindqvist', 'Tomas Okafor'],
    year: 2026,
    doi: null,
    arxivId: '2602.04891',
    fullTextStatus: 'oa_fulltext',
    ...overrides,
  };
}

export function testSection(overrides: Partial<Section> = {}): Section {
  return {
    id: 'section-1',
    heading: 'Detection and screening at submission time',
    order: 1,
    prose: 'This section draws on one verified paper.',
    claims: [testClaim()],
    ...overrides,
  };
}
