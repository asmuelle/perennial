import { arxivHarvestWeek, fixtureTopic, resolverRegistry } from '@perennial/fixtures';
import { describe, expect, test } from 'vitest';
import { parseHarvest, parseResolverRegistry, parseTopic } from './ingest';

describe('parseHarvest (boundary validation of upstream data)', () => {
  test('accepts the checked-in weekly harvest fixture', () => {
    // Arrange + Act
    const result = parseHarvest(arxivHarvestWeek);

    // Assert
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.records).toHaveLength(12);
      expect(result.value.source).toBe('arxiv');
    }
  });

  test('rejects a record with a malformed arXiv id', () => {
    // Arrange
    const payload = {
      source: 'arxiv',
      harvestedAt: '2026-06-01T04:00:00Z',
      records: [
        {
          arxivId: 'not-an-id',
          doi: null,
          title: 't',
          authors: [{ name: 'A' }],
          abstract: 'a.',
          categories: ['cs.CL'],
          publishedAt: '2026-05-21T17:42:00Z',
          oaPdfUrl: null,
          references: [],
        },
      ],
    };

    // Act
    const result = parseHarvest(payload);

    // Assert
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('arxivId');
    }
  });

  test('rejects a payload from an unknown source', () => {
    const result = parseHarvest({ source: 'rss-scrape', harvestedAt: 'x', records: [] });

    expect(result.ok).toBe(false);
  });

  test('rejects a record missing its abstract', () => {
    const result = parseHarvest({
      source: 'arxiv',
      harvestedAt: '2026-06-01T04:00:00Z',
      records: [
        {
          arxivId: '2601.00001v1',
          doi: null,
          title: 't',
          authors: [{ name: 'A' }],
          categories: ['cs.CL'],
          publishedAt: '2026-05-21T17:42:00Z',
          oaPdfUrl: null,
          references: [],
        },
      ],
    });

    expect(result.ok).toBe(false);
  });
});

describe('parseTopic / parseResolverRegistry', () => {
  test('accept the checked-in fixtures', () => {
    expect(parseTopic(fixtureTopic).ok).toBe(true);
    expect(parseResolverRegistry(resolverRegistry).ok).toBe(true);
  });

  test('reject malformed inputs', () => {
    expect(parseTopic({ id: '' }).ok).toBe(false);
    expect(parseResolverRegistry(null).ok).toBe(false);
  });
});
