import type { ClaimStatus, EvidenceConfidence } from '@perennial/core';

/** Pure presentation helpers — deterministic, locale-pinned, unit-tested. */

const STATUS_LABELS: Record<ClaimStatus, string> = {
  supported: 'Supported',
  contradicted: 'Contradicted',
  superseded: 'Superseded',
  needs_review: 'Needs review',
};

export function statusLabel(status: ClaimStatus): string {
  return STATUS_LABELS[status];
}

export function confidenceLabel(confidence: EvidenceConfidence): string | null {
  return confidence === 'abstract_only' ? 'Abstract-only evidence' : null;
}

export function formatCostUsd(costCents: number): string {
  return `$${(costCents / 100).toFixed(2)}`;
}

const DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC',
});

export function formatVerifiedDate(iso: string): string {
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) {
    throw new Error(`unparseable date: ${iso}`);
  }
  return DATE_FORMAT.format(new Date(parsed));
}

export function formatAuthors(authors: readonly string[]): string {
  if (authors.length <= 2) {
    return authors.join(' and ');
  }
  return `${authors[0]} et al.`;
}
