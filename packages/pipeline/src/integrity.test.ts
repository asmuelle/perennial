import {
  arxivHarvestWeek,
  injectedFakeDoiHarvest,
  resolverRegistry,
} from '@perennial/fixtures';
import { unwrap } from '@perennial/core';
import { describe, expect, test } from 'vitest';
import { parseHarvest, parseResolverRegistry } from './ingest';
import { createFixtureResolver, isDoi, screenRecordIntegrity } from './integrity';

const resolver = createFixtureResolver(unwrap(parseResolverRegistry(resolverRegistry)));
const records = unwrap(parseHarvest(arxivHarvestWeek)).records;

function record(arxivId: string) {
  const found = records.find((r) => r.arxivId === arxivId);
  if (!found) {
    throw new Error(`missing record ${arxivId}`);
  }
  return found;
}

describe('fixture resolver (deterministic, invariant 3)', () => {
  test('routes DOIs to crossref and arXiv ids to arxiv', () => {
    expect(resolver.resolve('10.1162/qss_a_00112')).toEqual({
      resolver: 'crossref',
      httpStatus: 200,
    });
    expect(resolver.resolve('2512.04417')).toEqual({ resolver: 'arxiv', httpStatus: 200 });
  });

  test('strips version suffixes before arXiv lookup', () => {
    expect(resolver.resolve('2601.11342v2')).toEqual({ resolver: 'arxiv', httpStatus: 200 });
  });

  test('returns null for identifiers that resolve nowhere', () => {
    expect(resolver.resolve('10.9999/fake.2026.001')).toBeNull();
    expect(resolver.resolve('2699.99999')).toBeNull();
  });

  test('isDoi distinguishes DOI from arXiv identifiers', () => {
    expect(isDoi('10.1162/qss_a_00112')).toBe(true);
    expect(isDoi('2512.04417')).toBe(false);
  });
});

describe('reference-integrity screen (invariant 1: the brand promise)', () => {
  test('passes a clean record with fully resolvable references', () => {
    const report = screenRecordIntegrity(record('2602.04891v1'), resolver);

    expect(report.ok).toBe(true);
    expect(report.flags).toEqual([]);
  });

  test('rejects the injected fake-DOI record with evidence attached', () => {
    // Arrange — the invariant-1 attack fixture
    const fake = unwrap(parseHarvest(injectedFakeDoiHarvest)).records[0];
    if (!fake) {
      throw new Error('fixture missing');
    }

    // Act
    const report = screenRecordIntegrity(fake, resolver);

    // Assert
    expect(report.ok).toBe(false);
    expect(report.flags).toContainEqual({
      identifier: '10.5555/perennial.fake.999',
      kind: 'own_doi',
      reason: 'unresolvable',
    });
    expect(report.flags).toContainEqual({
      identifier: '2699.99999v1',
      kind: 'own_arxiv_id',
      reason: 'unresolvable',
    });
  });

  test('flags a fabricated reference inside an otherwise real paper', () => {
    // Arrange — the slop survey cites 10.9999/fake.2026.001
    const report = screenRecordIntegrity(record('2604.05521v1'), resolver);

    // Assert
    expect(report.ok).toBe(false);
    expect(report.flags).toEqual([
      { identifier: '10.9999/fake.2026.001', kind: 'reference', reason: 'unresolvable' },
    ]);
  });
});
