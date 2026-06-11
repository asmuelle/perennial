import { describe, expect, test } from 'vitest';
import { gateRenderableCitations, isVerifiedCitation } from './citations';
import { unverifiedCitation, verifiedCitation } from './testing';

describe('isVerifiedCitation (invariant 1: no unverified references)', () => {
  test('accepts a citation with a recorded successful resolution', () => {
    // Arrange + Act + Assert
    expect(isVerifiedCitation(verifiedCitation())).toBe(true);
  });

  test('rejects a citation with no verification record', () => {
    expect(isVerifiedCitation(unverifiedCitation())).toBe(false);
  });

  test('rejects a citation whose resolution returned a non-2xx status', () => {
    // Arrange
    const citation = verifiedCitation({
      verification: { resolver: 'crossref', resolvedAt: '2026-06-08T00:00:00.000Z', httpStatus: 404 },
    });

    // Act + Assert
    expect(isVerifiedCitation(citation)).toBe(false);
  });

  test('rejects a citation with an unparseable resolvedAt timestamp', () => {
    const citation = verifiedCitation({
      verification: { resolver: 'arxiv', resolvedAt: 'not-a-date', httpStatus: 200 },
    });

    expect(isVerifiedCitation(citation)).toBe(false);
  });
});

describe('gateRenderableCitations (the single render gate)', () => {
  test('passes through a fully verified citation list', () => {
    // Arrange
    const citations = [verifiedCitation(), verifiedCitation({ id: 'cite-2', claimId: 'claim-2' })];

    // Act
    const result = gateRenderableCitations(citations);

    // Assert
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(2);
    }
  });

  test('rejects the whole batch when a single injected unverified citation is present', () => {
    // Arrange — invariant 1 injection test
    const citations = [verifiedCitation(), unverifiedCitation({ id: 'cite-fake' })];

    // Act
    const result = gateRenderableCitations(citations);

    // Assert
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.reason).toBe('unverified_citations');
      expect(result.error.citationIds).toEqual(['cite-fake']);
    }
  });

  test('accepts an empty citation list', () => {
    expect(gateRenderableCitations([]).ok).toBe(true);
  });
});
