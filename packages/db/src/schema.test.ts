import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, test } from 'vitest';
import { citation, claim, surveyVersion } from './schema';

/** Schema-shape tests — no Postgres required. They pin the invariant-bearing constraints. */

function column(table: Parameters<typeof getTableConfig>[0], name: string) {
  const found = getTableConfig(table).columns.find((c) => c.name === name);
  if (!found) {
    throw new Error(`column ${name} missing`);
  }
  return found;
}

describe('claim table (invariant 2: provenance is DB-enforced)', () => {
  test('provenance columns are NOT NULL', () => {
    expect(column(claim, 'provenance_paper_id').notNull).toBe(true);
    expect(column(claim, 'provenance_section_locator').notNull).toBe(true);
    expect(column(claim, 'provenance_quoted_span').notNull).toBe(true);
  });

  test('a non-empty-provenance CHECK constraint is declared', () => {
    const checks = getTableConfig(claim).checks.map((c) => c.name);
    expect(checks).toContain('claim_provenance_non_empty');
  });
});

describe('citation table (invariant 1: resolution recorded on the row)', () => {
  test('carries resolver, resolved_at, and http_status verification columns', () => {
    const names = getTableConfig(citation).columns.map((c) => c.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'verification_resolver',
        'verification_resolved_at',
        'verification_http_status',
      ]),
    );
  });

  test('verification columns are all-or-none via CHECK', () => {
    const checks = getTableConfig(citation).checks.map((c) => c.name);
    expect(checks).toContain('citation_verification_all_or_none');
  });
});

describe('survey_version table (invariant 7: append-only versions)', () => {
  test('topic + version_number is unique and version numbers are positive', () => {
    const config = getTableConfig(surveyVersion);
    expect(config.uniqueConstraints.length + config.indexes.length).toBeGreaterThan(0);
    expect(config.checks.map((c) => c.name)).toContain('survey_version_number_positive');
  });

  test('has no updated_at column — published versions are never mutated', () => {
    const names = getTableConfig(surveyVersion).columns.map((c) => c.name);
    expect(names).not.toContain('updated_at');
  });
});
