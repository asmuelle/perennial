/** Core domain types. Everything is readonly: survey versions are append-only artifacts. */

export type ClaimStatus = 'supported' | 'contradicted' | 'superseded' | 'needs_review';

export type EvidenceConfidence = 'oa_fulltext' | 'abstract_only';

export type CitationResolver = 'crossref' | 'arxiv';

/** Where a claim's quoted span lives inside the source paper. */
export interface Provenance {
  readonly paperId: string;
  readonly sectionLocator: string;
  readonly quotedSpan: string;
}

export interface PaperRef {
  readonly id: string;
  readonly title: string;
  readonly authors: readonly string[];
  readonly year: number;
  readonly doi: string | null;
  readonly arxivId: string | null;
  readonly fullTextStatus: EvidenceConfidence;
}

export interface CitationVerification {
  readonly resolver: CitationResolver;
  readonly resolvedAt: string;
  readonly httpStatus: number;
}

export interface Citation {
  readonly id: string;
  readonly claimId: string;
  readonly paperId: string;
  readonly doiOrArxivId: string;
  readonly verification: CitationVerification | null;
}

export interface Claim {
  readonly id: string;
  readonly text: string;
  readonly status: ClaimStatus;
  readonly provenance: Provenance;
  readonly confidence: EvidenceConfidence;
}

export interface Section {
  readonly id: string;
  readonly heading: string;
  readonly order: number;
  readonly prose: string;
  readonly claims: readonly Claim[];
}

export interface SurveyVersion {
  readonly topicId: string;
  readonly versionNumber: number;
  readonly createdByRunId: string;
  readonly createdAt: string;
  readonly sections: readonly Section[];
  readonly citations: readonly Citation[];
  readonly papers: readonly PaperRef[];
}

export interface PipelineRunCounts {
  readonly harvested: number;
  readonly deduped: number;
  readonly triagedRelevant: number;
  readonly integrityExcluded: number;
  readonly integrated: number;
  readonly claimsDropped: number;
  readonly citationsRejected: number;
}

export interface PipelineRun {
  readonly id: string;
  readonly topicId: string;
  readonly week: string;
  readonly counts: PipelineRunCounts;
  readonly costCents: number;
  readonly modelVersions: readonly string[];
  readonly status: 'succeeded' | 'failed';
  readonly error: string | null;
}
