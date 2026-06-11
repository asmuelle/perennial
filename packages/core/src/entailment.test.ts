import { describe, expect, test } from 'vitest';
import {
  STAGE1_FLAG_THRESHOLD,
  deriveClaimStatus,
  shouldEscalateToFrontier,
} from './entailment';
import type { FrontierVerdict } from './entailment';

const contradictedVerdict: FrontierVerdict = {
  label: 'contradicted',
  claimEvidenceSpan: 'screening would have caught 91% of the failures',
  paperEvidenceSpan: 'screening caught only 54% of failures in replication',
};

describe('deriveClaimStatus (invariant 4: precision-biased entailment)', () => {
  test('returns needs_review when no frontier adjudication exists', () => {
    // Arrange + Act
    const status = deriveClaimStatus({ stage1Score: 0.97, frontier: null });

    // Assert
    expect(status).toBe('needs_review');
  });

  test('contradicted requires quoted evidence from both sides', () => {
    // Arrange + Act
    const status = deriveClaimStatus({ stage1Score: 0.9, frontier: contradictedVerdict });

    // Assert
    expect(status).toBe('contradicted');
  });

  test('contradicted downgrades to needs_review when claim-side evidence is missing', () => {
    // Arrange
    const verdict = { ...contradictedVerdict, claimEvidenceSpan: '' };

    // Act
    const status = deriveClaimStatus({ stage1Score: 0.9, frontier: verdict });

    // Assert
    expect(status).toBe('needs_review');
  });

  test('contradicted downgrades to needs_review when paper-side evidence is missing', () => {
    // Arrange
    const verdict = { ...contradictedVerdict, paperEvidenceSpan: '   ' };

    // Act
    const status = deriveClaimStatus({ stage1Score: 0.9, frontier: verdict });

    // Assert
    expect(status).toBe('needs_review');
  });

  test('supported and superseded verdicts pass through', () => {
    // Arrange
    const supported = { ...contradictedVerdict, label: 'supported' as const };
    const superseded = { ...contradictedVerdict, label: 'superseded' as const };

    // Act + Assert
    expect(deriveClaimStatus({ stage1Score: 0.8, frontier: supported })).toBe('supported');
    expect(deriveClaimStatus({ stage1Score: 0.8, frontier: superseded })).toBe('superseded');
  });
});

describe('shouldEscalateToFrontier (two-stage gating)', () => {
  test('escalates only at or above the stage-1 threshold', () => {
    // Arrange + Act + Assert
    expect(shouldEscalateToFrontier(STAGE1_FLAG_THRESHOLD)).toBe(true);
    expect(shouldEscalateToFrontier(STAGE1_FLAG_THRESHOLD - 0.01)).toBe(false);
  });
});
