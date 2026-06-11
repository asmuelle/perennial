import type { HarvestRecord } from './schemas';
import {
  INITIAL_SURVEY_BUDGET_CENTS,
  gateRenderableCitations,
  toBibtex,
  unwrap,
} from '@perennial/core';
import {
  FIXTURE_NOW_ISO,
  arxivHarvestWeek,
  fixtureTopic,
  injectedFakeDoiHarvest,
  resolverRegistry,
} from '@perennial/fixtures';
import { describe, expect, test } from 'vitest';
import { parseHarvest, parseResolverRegistry } from './ingest';
import { createFixtureResolver } from './integrity';
import { runInitialSurvey } from './run';
import { runFixtureSlice } from './slice';
import { createMockSynthesisModel } from './synthesize';
import { createMockTriageModel } from './triage';

const slice = runFixtureSlice();
const recordsByBase = new Map(
  unwrap(parseHarvest(arxivHarvestWeek)).records.map((r) => [
    r.arxivId.replace(/v\d+$/, ''),
    r,
  ]),
);

describe('M1 vertical slice: ingest → dedup → triage → integrity → synthesis → v1', () => {
  test('produces the expected four-section survey over eight papers', () => {
    // Assert
    expect(slice.version.versionNumber).toBe(1);
    expect(slice.version.sections.map((s) => s.heading)).toEqual([
      'Prevalence and audits of fabricated citations',
      'Detection and screening at submission time',
      'Span-grounded generation and claim verification',
      'Maintaining living literature reviews',
    ]);
    expect(slice.version.sections.flatMap((s) => s.claims)).toHaveLength(8);
    expect(slice.version.papers).toHaveLength(8);
  });

  test('100% of citations carry a recorded successful resolution (M1 accept)', () => {
    // Act
    const gate = gateRenderableCitations(slice.version.citations);

    // Assert
    expect(slice.version.citations).toHaveLength(8);
    expect(gate.ok).toBe(true);
    for (const citation of slice.version.citations) {
      expect(citation.verification?.resolvedAt).toBe(FIXTURE_NOW_ISO);
      expect(citation.verification?.httpStatus).toBe(200);
    }
  });

  test('every claim is pinned to a verbatim span from its source abstract (invariant 2)', () => {
    for (const claim of slice.version.sections.flatMap((s) => s.claims)) {
      const record = recordsByBase.get(claim.provenance.paperId) as HarvestRecord;
      expect(record).toBeDefined();
      expect(record.abstract).toContain(claim.provenance.quotedSpan);
      expect(claim.provenance.sectionLocator).toBe('abstract');
    }
  });

  test('dedup kept the latest revision: the audit claim quotes the v2 abstract', () => {
    const auditClaim = slice.version.sections
      .flatMap((s) => s.claims)
      .find((c) => c.provenance.paperId === '2601.11342');

    expect(auditClaim?.provenance.quotedSpan).toContain('52,000');
  });

  test('abstract-only evidence is labeled lower-confidence (invariant 6)', () => {
    const claims = slice.version.sections.flatMap((s) => s.claims);

    expect(claims.find((c) => c.provenance.paperId === '2604.09102')?.confidence).toBe(
      'abstract_only',
    );
    expect(claims.find((c) => c.provenance.paperId === '2602.04891')?.confidence).toBe(
      'oa_fulltext',
    );
  });

  test('records an auditable pipeline run with cost within the $8 budget (M1 accept)', () => {
    // Assert
    expect(slice.run.counts).toEqual({
      harvested: 12,
      deduped: 1,
      triagedRelevant: 8,
      integrityExcluded: 0,
      integrated: 8,
      claimsDropped: 0,
      citationsRejected: 0,
    });
    expect(slice.run.costCents).toBeGreaterThan(0);
    expect(slice.run.costCents).toBeLessThanOrEqual(INITIAL_SURVEY_BUDGET_CENTS);
    expect(slice.run.modelVersions).toEqual(['mock-triage-v1', 'mock-synthesis-v1']);
    expect(slice.run.status).toBe('succeeded');
  });

  test('is reproducible byte-for-byte across runs (pipeline determinism)', () => {
    const again = runFixtureSlice();

    expect(JSON.stringify(again)).toBe(JSON.stringify(slice));
  });

  test('BibTeX export succeeds and embeds only verified citations (invariant 3)', () => {
    // Act
    const bibtex = unwrap(toBibtex(slice.version.citations, slice.version.papers));

    // Assert
    expect((bibtex.match(/@article\{/g) ?? []).length).toBe(8);
    expect(bibtex).toContain('Reference verified via');
  });

  test('an injected fake-DOI paper is rejected before render (M1 accept)', () => {
    // Arrange — merge the attack record into the weekly harvest
    const harvest = unwrap(parseHarvest(arxivHarvestWeek));
    const fake = unwrap(parseHarvest(injectedFakeDoiHarvest)).records[0] as HarvestRecord;
    const poisoned = { ...harvest, records: [...harvest.records, fake] };
    const registry = unwrap(parseResolverRegistry(resolverRegistry));

    // Act
    const output = unwrap(
      runInitialSurvey({
        harvest: poisoned,
        topic: fixtureTopic,
        resolver: createFixtureResolver(registry),
        triageModel: createMockTriageModel(),
        synthesisModel: createMockSynthesisModel(),
        nowIso: FIXTURE_NOW_ISO,
        runId: 'run-injection-test',
      }),
    );

    // Assert — the fake paper is screened out with evidence, never cited
    expect(output.run.counts.integrityExcluded).toBe(1);
    expect(output.version.papers.some((p) => p.id === '2699.99999')).toBe(false);
    expect(
      output.version.citations.some((c) => c.doiOrArxivId === '10.5555/perennial.fake.999'),
    ).toBe(false);
    const report = output.integrityReports.find((r) => r.arxivBaseId === '2699.99999');
    expect(report?.ok).toBe(false);
    expect(report?.flags.length).toBeGreaterThan(0);
  });

  test('rejects a malformed harvest at the boundary instead of guessing', () => {
    const registry = unwrap(parseResolverRegistry(resolverRegistry));

    const result = runInitialSurvey({
      harvest: { source: 'arxiv', records: 'nope' },
      topic: fixtureTopic,
      resolver: createFixtureResolver(registry),
      triageModel: createMockTriageModel(),
      synthesisModel: createMockSynthesisModel(),
      nowIso: FIXTURE_NOW_ISO,
      runId: 'run-bad-input',
    });

    expect(result.ok).toBe(false);
  });
});
