import { arxivHarvestWeek, FIXTURE_NOW_ISO, resolverRegistry } from '@perennial/fixtures';
import { unwrap } from '@perennial/core';
import { describe, expect, test } from 'vitest';
import { bindDraftSections } from './bind';
import { parseHarvest, parseResolverRegistry } from './ingest';
import { createFixtureResolver } from './integrity';
import type { DraftSection } from './synthesize';

const resolver = createFixtureResolver(unwrap(parseResolverRegistry(resolverRegistry)));
const records = unwrap(parseHarvest(arxivHarvestWeek)).records;
const guard = records[0]; // 2602.04891v1 CitationGuard

function draft(overrides: Partial<DraftSection['claims'][number]> = {}): DraftSection {
  return {
    heading: 'Detection and screening at submission time',
    prose: 'Prose.',
    claims: [
      {
        paperBaseId: '2602.04891',
        text: 'Lindqvist et al. (2026) report deterministic screening works.',
        quotedSpan: 'The screening pipeline runs in under nine seconds per manuscript on commodity hardware.',
        ...overrides,
      },
    ],
  };
}

describe('bindDraftSections (model output is untrusted)', () => {
  test('binds a verbatim-span claim and records the citation resolution', () => {
    // Act
    const bound = bindDraftSections([draft()], records, resolver, FIXTURE_NOW_ISO);

    // Assert
    expect(bound.sections).toHaveLength(1);
    expect(bound.citations).toHaveLength(1);
    expect(bound.citations[0]?.verification).toEqual({
      resolver: 'arxiv',
      resolvedAt: FIXTURE_NOW_ISO,
      httpStatus: 200,
    });
    expect(bound.dropped).toEqual([]);
  });

  test('drops a claim whose quoted span is not verbatim in the source abstract', () => {
    // Arrange — the model paraphrased instead of quoting (invariant 2)
    const paraphrased = draft({ quotedSpan: 'Screening is fast and runs in about nine seconds.' });

    // Act
    const bound = bindDraftSections([paraphrased], records, resolver, FIXTURE_NOW_ISO);

    // Assert
    expect(bound.sections).toEqual([]);
    expect(bound.citations).toEqual([]);
    expect(bound.dropped).toEqual([
      { paperBaseId: '2602.04891', reason: 'span_not_verbatim' },
    ]);
  });

  test('drops a claim about a paper the pipeline never screened', () => {
    // Arrange — the model hallucinated a source (invariant 1)
    const invented = draft({ paperBaseId: '9999.99999' });

    // Act
    const bound = bindDraftSections([invented], records, resolver, FIXTURE_NOW_ISO);

    // Assert
    expect(bound.dropped).toEqual([{ paperBaseId: '9999.99999', reason: 'unknown_paper' }]);
    expect(bound.citations).toEqual([]);
  });

  test('rejects the citation when resolution fails at write time', () => {
    // Arrange — resolver refuses everything: nothing may render
    const deadResolver = { resolve: () => null };

    // Act
    const bound = bindDraftSections([draft()], records, deadResolver, FIXTURE_NOW_ISO);

    // Assert
    expect(bound.citationsRejected).toBe(1);
    expect(bound.sections).toEqual([]);
    expect(bound.citations).toEqual([]);
  });

  test('labels abstract-only papers as lower-confidence (invariant 6)', () => {
    // Arrange — 2604.09102 has no OA PDF
    const ensembles: DraftSection = {
      heading: 'Detection and screening at submission time',
      prose: 'Prose.',
      claims: [
        {
          paperBaseId: '2604.09102',
          text: 'Kovacs et al. (2026) report verifier ensembles work.',
          quotedSpan: 'Resolvability checks alone account for two thirds of the detection signal.',
        },
      ],
    };

    // Act
    const bound = bindDraftSections([ensembles], records, resolver, FIXTURE_NOW_ISO);

    // Assert
    expect(bound.sections[0]?.claims[0]?.confidence).toBe('abstract_only');
    expect(guard && bindDraftSections([draft()], records, resolver, FIXTURE_NOW_ISO).sections[0]?.claims[0]?.confidence).toBe(
      'oa_fulltext',
    );
  });
});
