import { deepFreeze } from './freeze';
import type { Result } from './result';
import { err, ok } from './result';
import type { Claim, ClaimStatus, EvidenceConfidence, Provenance } from './types';

export interface ClaimInput {
  readonly id: string;
  readonly text: string;
  readonly status: ClaimStatus;
  readonly provenance: Provenance;
  readonly confidence: EvidenceConfidence;
}

function provenanceError(input: ClaimInput): string | null {
  const { provenance } = input;
  if (provenance.paperId.trim().length === 0) {
    return `claim ${input.id}: provenance.paperId is empty`;
  }
  if (provenance.sectionLocator.trim().length === 0) {
    return `claim ${input.id}: provenance.sectionLocator is empty`;
  }
  if (provenance.quotedSpan.trim().length === 0) {
    return `claim ${input.id}: provenance.quotedSpan is empty`;
  }
  return null;
}

/**
 * PRODUCT INVARIANT 2: a claim without pinned provenance (paper + section locator +
 * quoted span) cannot exist. This is the only constructor for `Claim`.
 */
export function createClaim(input: ClaimInput): Result<Claim> {
  if (input.id.trim().length === 0) {
    return err('claim id is empty');
  }
  if (input.text.trim().length === 0) {
    return err(`claim ${input.id}: text is empty`);
  }
  const issue = provenanceError(input);
  if (issue !== null) {
    return err(issue);
  }
  return ok(
    deepFreeze({
      id: input.id,
      text: input.text,
      status: input.status,
      provenance: { ...input.provenance },
      confidence: input.confidence,
    }),
  );
}
