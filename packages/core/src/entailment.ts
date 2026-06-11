import type { ClaimStatus } from './types';

/**
 * Two-stage entailment (PRODUCT INVARIANT 4): a cheap cross-encoder proposes
 * claim–paper pairs; only flagged pairs reach frontier adjudication; and
 * `contradicted` is unreachable without a frontier verdict carrying quoted
 * evidence from BOTH sides. When uncertain, the answer is `needs_review`.
 */

export const STAGE1_FLAG_THRESHOLD = 0.5;

export interface FrontierVerdict {
  readonly label: 'supported' | 'contradicted' | 'superseded';
  readonly claimEvidenceSpan: string;
  readonly paperEvidenceSpan: string;
}

export interface EntailmentAssessment {
  readonly stage1Score: number;
  readonly frontier: FrontierVerdict | null;
}

export function shouldEscalateToFrontier(stage1Score: number): boolean {
  return stage1Score >= STAGE1_FLAG_THRESHOLD;
}

function hasBothEvidenceSpans(verdict: FrontierVerdict): boolean {
  return verdict.claimEvidenceSpan.trim().length > 0 && verdict.paperEvidenceSpan.trim().length > 0;
}

/** Derives the user-visible claim status. Precision-biased: uncertainty never escalates. */
export function deriveClaimStatus(assessment: EntailmentAssessment): ClaimStatus {
  const { frontier } = assessment;
  if (frontier === null) {
    return 'needs_review';
  }
  if (frontier.label === 'contradicted') {
    return hasBothEvidenceSpans(frontier) ? 'contradicted' : 'needs_review';
  }
  return frontier.label;
}
