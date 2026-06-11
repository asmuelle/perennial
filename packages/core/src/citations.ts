import type { Result } from './result';
import { err, ok } from './result';
import type { Citation } from './types';

/**
 * PRODUCT INVARIANT 1: no unverified references, ever. A citation is renderable
 * only if it carries a recorded, successful resolution (Crossref or arXiv).
 */
export function isVerifiedCitation(citation: Citation): boolean {
  const { verification } = citation;
  if (verification === null) {
    return false;
  }
  const resolvedAtValid = !Number.isNaN(Date.parse(verification.resolvedAt));
  const statusOk = verification.httpStatus >= 200 && verification.httpStatus < 300;
  return resolvedAtValid && statusOk;
}

export interface UnverifiedCitationError {
  readonly reason: 'unverified_citations';
  readonly citationIds: readonly string[];
}

/**
 * The single render gate. Every surface (reader, BibTeX export, delta email)
 * must pass its citations through here before showing them to a user.
 */
export function gateRenderableCitations(
  citations: readonly Citation[],
): Result<readonly Citation[], UnverifiedCitationError> {
  const unverified = citations.filter((citation) => !isVerifiedCitation(citation));
  if (unverified.length > 0) {
    return err({
      reason: 'unverified_citations',
      citationIds: unverified.map((citation) => citation.id),
    });
  }
  return ok(citations);
}
