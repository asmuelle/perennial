import { describe, expect, test } from 'vitest';
import { unwrap } from './result';
import {
  testPaper,
  testSection,
  unverifiedCitation,
  verifiedCitation,
  TEST_RESOLVED_AT,
} from './testing';
import type { SurveyVersionInput } from './version';
import { buildSurveyVersion } from './version';

function validInput(overrides: Partial<SurveyVersionInput> = {}): SurveyVersionInput {
  return {
    topicId: 'topic-citation-integrity',
    versionNumber: 1,
    createdByRunId: 'run-1',
    createdAt: TEST_RESOLVED_AT,
    sections: [testSection()],
    citations: [verifiedCitation()],
    papers: [testPaper()],
    ...overrides,
  };
}

describe('buildSurveyVersion (invariants 1 and 7)', () => {
  test('builds a survey version when every citation is verified', () => {
    // Arrange + Act
    const result = buildSurveyVersion(validInput());

    // Assert
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.versionNumber).toBe(1);
      expect(result.value.sections).toHaveLength(1);
    }
  });

  test('refuses to build when an injected unverified citation is present', () => {
    // Arrange — the invariant-1 injection test at the version boundary
    const input = validInput({
      citations: [verifiedCitation(), unverifiedCitation()],
    });

    // Act
    const result = buildSurveyVersion(input);

    // Assert
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.reason).toBe('unverified_citations');
    }
  });

  test('refuses citations that point at no claim in the version', () => {
    // Arrange
    const input = validInput({
      citations: [verifiedCitation(), verifiedCitation({ id: 'cite-orphan', claimId: 'claim-ghost' })],
    });

    // Act
    const result = buildSurveyVersion(input);

    // Assert
    expect(result.ok).toBe(false);
    if (!result.ok && result.error.reason === 'orphan_citation') {
      expect(result.error.citationIds).toEqual(['cite-orphan']);
    } else {
      expect.fail('expected orphan_citation error');
    }
  });

  test('rejects non-positive or fractional version numbers', () => {
    expect(buildSurveyVersion(validInput({ versionNumber: 0 })).ok).toBe(false);
    expect(buildSurveyVersion(validInput({ versionNumber: 1.5 })).ok).toBe(false);
  });

  test('published versions are deeply immutable (invariant 7)', () => {
    // Arrange
    const version = unwrap(buildSurveyVersion(validInput()));

    // Act + Assert — strict mode: mutation throws
    expect(Object.isFrozen(version)).toBe(true);
    expect(Object.isFrozen(version.sections)).toBe(true);
    expect(Object.isFrozen(version.sections[0])).toBe(true);
    expect(Object.isFrozen(version.sections[0]?.claims[0])).toBe(true);
    expect(() => {
      (version as { versionNumber: number }).versionNumber = 99;
    }).toThrow();
  });
});
