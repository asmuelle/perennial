import { describe, expect, test } from 'vitest';
import { diffSurveyVersions } from './diff';
import { unwrap } from './result';
import { testClaim, testPaper, testSection, verifiedCitation } from './testing';
import type { Section, SurveyVersion } from './types';
import { buildSurveyVersion } from './version';

function makeVersion(versionNumber: number, sections: readonly Section[]): SurveyVersion {
  return unwrap(
    buildSurveyVersion({
      topicId: 'topic-citation-integrity',
      versionNumber,
      createdByRunId: `run-${versionNumber}`,
      createdAt: '2026-06-08T00:00:00.000Z',
      sections,
      citations: [verifiedCitation()],
      papers: [testPaper()],
    }),
  );
}

describe('diffSurveyVersions (invariant 3: deterministic version diffing)', () => {
  test('reports no material change for identical versions', () => {
    // Arrange
    const v1 = makeVersion(1, [testSection()]);
    const v2 = makeVersion(2, [testSection()]);

    // Act
    const diff = diffSurveyVersions(v1, v2);

    // Assert
    expect(diff.materialChange).toBe(false);
    expect(diff.changedSections).toEqual([]);
    expect(diff.fromVersion).toBe(1);
    expect(diff.toVersion).toBe(2);
  });

  test('detects prose changes in an existing section', () => {
    // Arrange
    const v1 = makeVersion(1, [testSection()]);
    const v2 = makeVersion(2, [testSection({ prose: 'Rewritten after new evidence arrived.' })]);

    // Act
    const diff = diffSurveyVersions(v1, v2);

    // Assert
    expect(diff.materialChange).toBe(true);
    expect(diff.changedSections).toHaveLength(1);
    expect(diff.changedSections[0]?.proseChanged).toBe(true);
  });

  test('reports exact added and removed claim ids', () => {
    // Arrange
    const kept = testClaim();
    const removed = testClaim({ id: 'claim-removed' });
    const added = testClaim({ id: 'claim-added' });
    const v1 = makeVersion(1, [testSection({ claims: [kept, removed] })]);
    const v2 = makeVersion(2, [testSection({ claims: [kept, added] })]);

    // Act
    const diff = diffSurveyVersions(v1, v2);

    // Assert
    expect(diff.changedSections[0]?.addedClaimIds).toEqual(['claim-added']);
    expect(diff.changedSections[0]?.removedClaimIds).toEqual(['claim-removed']);
  });

  test('records claim status transitions with from and to', () => {
    // Arrange
    const before = testClaim({ status: 'supported' });
    const after = testClaim({ status: 'contradicted' });
    const v1 = makeVersion(1, [testSection({ claims: [before] })]);
    const v2 = makeVersion(2, [testSection({ claims: [after] })]);

    // Act
    const diff = diffSurveyVersions(v1, v2);

    // Assert
    expect(diff.changedSections[0]?.statusChanges).toEqual([
      { claimId: 'claim-1', from: 'supported', to: 'contradicted' },
    ]);
  });

  test('detects added and removed sections', () => {
    // Arrange
    const v1 = makeVersion(1, [testSection()]);
    const v2 = makeVersion(2, [testSection({ id: 'section-new', heading: 'New direction' })]);

    // Act
    const diff = diffSurveyVersions(v1, v2);

    // Assert
    expect(diff.addedSectionIds).toEqual(['section-new']);
    expect(diff.removedSectionIds).toEqual(['section-1']);
    expect(diff.materialChange).toBe(true);
  });

  test('is deterministic: same inputs produce deep-equal diffs', () => {
    // Arrange
    const v1 = makeVersion(1, [testSection({ claims: [testClaim()] })]);
    const v2 = makeVersion(2, [testSection({ prose: 'changed' })]);

    // Act + Assert
    expect(diffSurveyVersions(v1, v2)).toEqual(diffSurveyVersions(v1, v2));
  });
});
