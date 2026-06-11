import { describe, expect, test } from 'vitest';
import {
  confidenceLabel,
  formatAuthors,
  formatCostUsd,
  formatVerifiedDate,
  statusLabel,
} from './labels';

describe('reader presentation helpers', () => {
  test('maps every claim status to a human label', () => {
    expect(statusLabel('supported')).toBe('Supported');
    expect(statusLabel('contradicted')).toBe('Contradicted');
    expect(statusLabel('superseded')).toBe('Superseded');
    expect(statusLabel('needs_review')).toBe('Needs review');
  });

  test('labels abstract-only evidence as lower confidence (invariant 6)', () => {
    expect(confidenceLabel('abstract_only')).toBe('Abstract-only evidence');
    expect(confidenceLabel('oa_fulltext')).toBeNull();
  });

  test('formats integer cents as dollars', () => {
    expect(formatCostUsd(310)).toBe('$3.10');
    expect(formatCostUsd(0)).toBe('$0.00');
  });

  test('formats verification dates deterministically in UTC', () => {
    expect(formatVerifiedDate('2026-06-08T00:00:00.000Z')).toBe('June 8, 2026');
  });

  test('throws on unparseable dates instead of rendering garbage', () => {
    expect(() => formatVerifiedDate('not-a-date')).toThrow('unparseable');
  });

  test('abbreviates long author lists', () => {
    expect(formatAuthors(['A One', 'B Two'])).toBe('A One and B Two');
    expect(formatAuthors(['A One', 'B Two', 'C Three'])).toBe('A One et al.');
  });
});
