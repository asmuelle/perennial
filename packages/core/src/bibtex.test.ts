import { describe, expect, test } from 'vitest';
import { bibtexKey, toBibtex } from './bibtex';
import { unwrap } from './result';
import { testPaper, unverifiedCitation, verifiedCitation } from './testing';

describe('toBibtex (invariant 3: deterministic export; invariant 1: verified-only)', () => {
  test('generates a deterministic entry from citation rows and paper metadata', () => {
    // Arrange
    const citations = [verifiedCitation()];
    const papers = [testPaper()];

    // Act
    const first = unwrap(toBibtex(citations, papers));
    const second = unwrap(toBibtex(citations, papers));

    // Assert — byte-stable and built only from verified rows
    expect(first).toBe(second);
    expect(first).toContain('@article{lindqvist2026citationguard,');
    expect(first).toContain('author = {Mara Lindqvist and Tomas Okafor}');
    expect(first).toContain('eprint = {2602.04891}');
    expect(first).toContain('Reference verified via arxiv on 2026-06-08');
  });

  test('refuses to export when any citation is unverified', () => {
    // Arrange — invariant 1 injection through the export path
    const citations = [verifiedCitation(), unverifiedCitation()];

    // Act
    const result = toBibtex(citations, [testPaper()]);

    // Assert
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.reason).toBe('unverified_citations');
    }
  });

  test('fails on a citation whose paper metadata is missing', () => {
    const result = toBibtex([verifiedCitation({ paperId: 'paper-ghost' })], [testPaper()]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.reason).toBe('unknown_paper');
    }
  });

  test('emits one entry per unique cited paper, sorted by key', () => {
    // Arrange — two claims cite the same paper, plus a second paper
    const paperB = testPaper({
      id: 'paper-2',
      title: 'Audit of Hallucinated Citations',
      authors: ['Aiko Tanaka'],
      arxivId: '2601.11342',
    });
    const citations = [
      verifiedCitation(),
      verifiedCitation({ id: 'cite-2', claimId: 'claim-2' }),
      verifiedCitation({ id: 'cite-3', claimId: 'claim-3', paperId: 'paper-2', doiOrArxivId: '2601.11342' }),
    ];

    // Act
    const bibtex = unwrap(toBibtex(citations, [testPaper(), paperB]));

    // Assert
    const entryCount = (bibtex.match(/@article\{/g) ?? []).length;
    expect(entryCount).toBe(2);
    expect(bibtex.indexOf('lindqvist2026')).toBeLessThan(bibtex.indexOf('tanaka2026'));
  });

  test('prefers DOI over eprint when the paper has one', () => {
    const paper = testPaper({ doi: '10.1162/qss_a_00112' });

    const bibtex = unwrap(toBibtex([verifiedCitation()], [paper]));

    expect(bibtex).toContain('doi = {10.1162/qss_a_00112}');
    expect(bibtex).not.toContain('eprint');
  });
});

describe('bibtexKey', () => {
  test('derives a stable key from first author, year, and first meaningful title word', () => {
    expect(bibtexKey(testPaper())).toBe('lindqvist2026citationguard');
  });
});
