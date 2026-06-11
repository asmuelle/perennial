import { gateRenderableCitations } from './citations';
import type { UnverifiedCitationError } from './citations';
import { deepFreeze } from './freeze';
import type { Result } from './result';
import { err, ok } from './result';
import type { Citation, PaperRef, Section, SurveyVersion } from './types';

export interface SurveyVersionInput {
  readonly topicId: string;
  readonly versionNumber: number;
  readonly createdByRunId: string;
  readonly createdAt: string;
  readonly sections: readonly Section[];
  readonly citations: readonly Citation[];
  readonly papers: readonly PaperRef[];
}

export type SurveyVersionError =
  | UnverifiedCitationError
  | { readonly reason: 'invalid_version_number'; readonly versionNumber: number }
  | { readonly reason: 'orphan_citation'; readonly citationIds: readonly string[] };

function orphanCitationIds(input: SurveyVersionInput): readonly string[] {
  const claimIds = new Set(
    input.sections.flatMap((section) => section.claims.map((claim) => claim.id)),
  );
  return input.citations.filter((c) => !claimIds.has(c.claimId)).map((c) => c.id);
}

/**
 * The only constructor for a publishable survey version. Enforces:
 * - PRODUCT INVARIANT 1 — every citation verified before the version exists;
 * - PRODUCT INVARIANT 7 — the returned version is deep-frozen (append-only history).
 */
export function buildSurveyVersion(
  input: SurveyVersionInput,
): Result<SurveyVersion, SurveyVersionError> {
  if (!Number.isInteger(input.versionNumber) || input.versionNumber < 1) {
    return err({ reason: 'invalid_version_number', versionNumber: input.versionNumber });
  }
  const gated = gateRenderableCitations(input.citations);
  if (!gated.ok) {
    return err(gated.error);
  }
  const orphans = orphanCitationIds(input);
  if (orphans.length > 0) {
    return err({ reason: 'orphan_citation', citationIds: orphans });
  }
  return ok(
    deepFreeze({
      topicId: input.topicId,
      versionNumber: input.versionNumber,
      createdByRunId: input.createdByRunId,
      createdAt: input.createdAt,
      sections: input.sections,
      citations: input.citations,
      papers: input.papers,
    }),
  );
}
