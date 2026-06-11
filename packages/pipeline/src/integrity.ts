import { arxivBaseId } from './dedup';
import type { HarvestRecord, ResolverRegistry } from './schemas';

/**
 * Reference-integrity screen (invariants 1 and 3): a purely deterministic
 * resolution pass. By construction no model participates — this module has
 * no dependency on any model interface.
 */

export interface Resolution {
  readonly resolver: 'crossref' | 'arxiv';
  readonly httpStatus: number;
}

export interface ReferenceResolver {
  /** Returns the recorded resolution, or null when the identifier resolves nowhere. */
  resolve(identifier: string): Resolution | null;
}

export function isDoi(identifier: string): boolean {
  return identifier.startsWith('10.');
}

/** Deterministic resolver backed by the frozen Crossref/arXiv registry snapshot. */
export function createFixtureResolver(registry: ResolverRegistry): ReferenceResolver {
  return {
    resolve(identifier) {
      if (isDoi(identifier)) {
        const entry = registry.doi[identifier];
        return entry === undefined ? null : { resolver: 'crossref', httpStatus: entry.httpStatus };
      }
      const entry = registry.arxiv[arxivBaseId(identifier)];
      return entry === undefined ? null : { resolver: 'arxiv', httpStatus: entry.httpStatus };
    },
  };
}

export interface IntegrityFlag {
  readonly identifier: string;
  readonly kind: 'own_doi' | 'own_arxiv_id' | 'reference';
  readonly reason: 'unresolvable';
}

export interface IntegrityReport {
  readonly arxivBaseId: string;
  readonly ok: boolean;
  readonly flags: readonly IntegrityFlag[];
}

function isResolved(resolution: Resolution | null): boolean {
  return resolution !== null && resolution.httpStatus >= 200 && resolution.httpStatus < 300;
}

/** Screens a candidate's own identifiers and its full reference list. */
export function screenRecordIntegrity(
  record: HarvestRecord,
  resolver: ReferenceResolver,
): IntegrityReport {
  const flags: IntegrityFlag[] = [];
  if (record.doi !== null && !isResolved(resolver.resolve(record.doi))) {
    flags.push({ identifier: record.doi, kind: 'own_doi', reason: 'unresolvable' });
  }
  if (!isResolved(resolver.resolve(arxivBaseId(record.arxivId)))) {
    flags.push({ identifier: record.arxivId, kind: 'own_arxiv_id', reason: 'unresolvable' });
  }
  for (const reference of record.references) {
    if (!isResolved(resolver.resolve(reference))) {
      flags.push({ identifier: reference, kind: 'reference', reason: 'unresolvable' });
    }
  }
  return { arxivBaseId: arxivBaseId(record.arxivId), ok: flags.length === 0, flags };
}
