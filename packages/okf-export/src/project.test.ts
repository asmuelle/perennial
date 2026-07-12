import type { Citation, Claim, PaperRef, PipelineRun, Section, SurveyVersion } from '@perennial/core';
import { describe, expect, it } from 'vitest';
import { projectSurveyBundle } from './project';
import type { SurveyExportInput } from './types';

const paper: PaperRef = {
  id: '2506.01234',
  title: 'Scaling laws for retrieval',
  authors: ['A. Author', 'B. Writer'],
  year: 2026,
  doi: null,
  arxivId: '2506.01234',
  fullTextStatus: 'oa_fulltext',
};

const claim: Claim = {
  id: 'claim-2506.01234',
  text: 'Retrieval quality scales with corpus size.',
  status: 'supported',
  provenance: {
    paperId: '2506.01234',
    sectionLocator: '§4.2',
    quotedSpan: 'quality improves log-linearly with corpus size',
  },
  confidence: 'oa_fulltext',
};

const verifiedCitation = (over: Partial<Citation> = {}): Citation => ({
  id: 'cite-2506.01234',
  claimId: 'claim-2506.01234',
  paperId: '2506.01234',
  doiOrArxivId: 'arXiv:2506.01234',
  verification: { resolver: 'arxiv', resolvedAt: '2026-06-08T00:00:00Z', httpStatus: 200 },
  ...over,
});

const section: Section = {
  id: 'section-findings',
  heading: 'Findings',
  order: 1,
  prose: 'The literature converges on a scaling relationship.',
  claims: [claim],
};

const run: PipelineRun = {
  id: 'run-fixture-2026-06-08',
  topicId: 'retrieval-scaling',
  week: '2026-06-08',
  counts: {
    harvested: 40,
    deduped: 31,
    triagedRelevant: 12,
    integrityExcluded: 1,
    integrated: 8,
    claimsDropped: 3,
    citationsRejected: 2,
  },
  costCents: 42,
  modelVersions: ['claude-sonnet-4-6'],
  status: 'succeeded',
  error: null,
};

const survey = (over: Partial<SurveyVersion> = {}): SurveyVersion => ({
  topicId: 'retrieval-scaling',
  versionNumber: 3,
  createdByRunId: 'run-fixture-2026-06-08',
  createdAt: '2026-06-08T01:00:00Z',
  sections: [section],
  citations: [verifiedCitation()],
  papers: [paper],
  ...over,
});

const inputOf = (over: Partial<SurveyExportInput> = {}): SurveyExportInput => ({
  survey: survey(),
  runs: [run],
  baseUrl: 'https://app.perennial.test',
  ...over,
});

describe('projectSurveyBundle', () => {
  it('bundles sections, papers, index and log, path-sorted', () => {
    // Act
    const { files, findings } = projectSurveyBundle(inputOf());

    // Assert
    expect([...files.keys()]).toEqual([
      'index.md',
      'log.md',
      'papers/2506-01234.md',
      'sections/01-findings.md',
    ]);
    expect(findings).toEqual([]);
  });

  it('renders a claim with pinned provenance, a paper cross-link, and the verified citation line', () => {
    // Act
    const md = projectSurveyBundle(inputOf()).files.get('sections/01-findings.md') ?? '';

    // Assert
    expect(md).toContain('type: Survey Section');
    expect(md).toContain('resource: https://app.perennial.test/#section-findings');
    expect(md).toContain('### Retrieval quality scales with corpus size.');
    expect(md).toContain('- Status: supported');
    expect(md).toContain('§4.2 in [Scaling laws for retrieval](../papers/2506-01234.md)');
    expect(md).toContain('- Citation: arXiv:2506.01234 (resolver arxiv, HTTP 200, resolved 2026-06-08T00:00:00Z)');
  });

  it('writes the version creation and the run into log.md', () => {
    // Act
    const log = projectSurveyBundle(inputOf()).files.get('log.md') ?? '';

    // Assert
    expect(log).toContain('Survey version 3 created by run run-fixture-2026-06-08');
    expect(log).toContain('8 integrated, 3 claims dropped, 2 citations rejected');
  });

  it('gates an unverified citation out and records an error finding', () => {
    // Arrange — the claim's citation failed to resolve (HTTP 404).
    const badCitation = verifiedCitation({
      verification: { resolver: 'arxiv', resolvedAt: '2026-06-08T00:00:00Z', httpStatus: 404 },
    });

    // Act
    const { files, findings } = projectSurveyBundle(inputOf({ survey: survey({ citations: [badCitation] }) }));
    const md = files.get('sections/01-findings.md') ?? '';

    // Assert — claim + provenance still render, but no verified-citation line, and a finding.
    expect(md).toContain('### Retrieval quality scales with corpus size.');
    expect(md).not.toContain('- Citation:');
    expect(findings).toContainEqual(
      expect.objectContaining({ check: 'UNVERIFIED_CITATION', severity: 'error' }),
    );
  });

  it('flags a claim with no citation', () => {
    // Act
    const { findings } = projectSurveyBundle(inputOf({ survey: survey({ citations: [] }) }));

    // Assert
    expect(findings).toContainEqual(
      expect.objectContaining({
        check: 'UNVERIFIED_CITATION',
        message: expect.stringContaining('no citation'),
      }),
    );
  });

  it('is byte-deterministic under shuffled section and paper order', () => {
    // Arrange
    const section2: Section = { ...section, id: 's2', heading: 'Methods', order: 2 };
    const forward = inputOf({ survey: survey({ sections: [section, section2] }) });
    const reversed = inputOf({ survey: survey({ sections: [section2, section] }) });

    // Act
    const a = projectSurveyBundle(forward);
    const b = projectSurveyBundle(reversed);

    // Assert
    expect([...a.files.entries()]).toEqual([...b.files.entries()]);
  });
});
