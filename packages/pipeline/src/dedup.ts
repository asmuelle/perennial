import type { HarvestRecord } from './schemas';

/** Deterministic dedup (invariant 3) — keyed on the versionless arXiv id. */

export function arxivBaseId(arxivId: string): string {
  return arxivId.replace(/v\d+$/, '');
}

export function arxivVersion(arxivId: string): number {
  const match = /v(\d+)$/.exec(arxivId);
  return match ? Number(match[1]) : 1;
}

export interface DedupResult {
  readonly kept: readonly HarvestRecord[];
  readonly removedCount: number;
}

/**
 * Collapses multiple versions of the same paper to the latest version and drops
 * records whose base id is already in the topic's seen-set. First-seen order is preserved.
 */
export function dedupHarvest(
  records: readonly HarvestRecord[],
  seenBaseIds: ReadonlySet<string> = new Set(),
): DedupResult {
  const byBase = new Map<string, HarvestRecord>();
  for (const record of records) {
    const base = arxivBaseId(record.arxivId);
    if (seenBaseIds.has(base)) {
      continue;
    }
    const existing = byBase.get(base);
    if (existing === undefined || arxivVersion(record.arxivId) > arxivVersion(existing.arxivId)) {
      byBase.set(base, record);
    }
  }
  const kept = [...byBase.values()];
  return { kept, removedCount: records.length - kept.length };
}
