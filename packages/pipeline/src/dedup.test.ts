import { arxivHarvestWeek } from '@perennial/fixtures';
import { unwrap } from '@perennial/core';
import { describe, expect, test } from 'vitest';
import { arxivBaseId, arxivVersion, dedupHarvest } from './dedup';
import { parseHarvest } from './ingest';

const records = unwrap(parseHarvest(arxivHarvestWeek)).records;

describe('dedupHarvest (deterministic dedup, invariant 3)', () => {
  test('collapses multiple arXiv versions to the latest one', () => {
    // Arrange: fixture contains 2601.11342v1 and v2

    // Act
    const { kept, removedCount } = dedupHarvest(records);

    // Assert
    expect(records).toHaveLength(12);
    expect(kept).toHaveLength(11);
    expect(removedCount).toBe(1);
    const audit = kept.find((r) => arxivBaseId(r.arxivId) === '2601.11342');
    expect(audit?.arxivId).toBe('2601.11342v2');
    expect(audit?.abstract).toContain('52,000');
  });

  test('drops records already in the seen-set', () => {
    // Arrange
    const seen = new Set(['2602.04891']);

    // Act
    const { kept } = dedupHarvest(records, seen);

    // Assert
    expect(kept.some((r) => arxivBaseId(r.arxivId) === '2602.04891')).toBe(false);
    expect(kept).toHaveLength(10);
  });

  test('preserves first-seen order and is reproducible', () => {
    const first = dedupHarvest(records);
    const second = dedupHarvest(records);

    expect(first).toEqual(second);
    expect(first.kept.map((r) => arxivBaseId(r.arxivId))[0]).toBe('2602.04891');
  });
});

describe('arXiv id helpers', () => {
  test('strip and read version suffixes', () => {
    expect(arxivBaseId('2601.11342v2')).toBe('2601.11342');
    expect(arxivBaseId('2512.04417')).toBe('2512.04417');
    expect(arxivVersion('2601.11342v2')).toBe(2);
    expect(arxivVersion('2512.04417')).toBe(1);
  });
});
