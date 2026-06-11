import type { Claim, ClaimStatus, Section, SurveyVersion } from './types';

/**
 * Deterministic structural diff between two immutable survey versions
 * (PRODUCT INVARIANTS 3 and 7). An LLM never decides what changed.
 */

export interface ClaimStatusChange {
  readonly claimId: string;
  readonly from: ClaimStatus;
  readonly to: ClaimStatus;
}

export interface SectionDiff {
  readonly sectionId: string;
  readonly heading: string;
  readonly proseChanged: boolean;
  readonly addedClaimIds: readonly string[];
  readonly removedClaimIds: readonly string[];
  readonly statusChanges: readonly ClaimStatusChange[];
}

export interface SurveyDiff {
  readonly fromVersion: number;
  readonly toVersion: number;
  readonly addedSectionIds: readonly string[];
  readonly removedSectionIds: readonly string[];
  readonly changedSections: readonly SectionDiff[];
  readonly materialChange: boolean;
}

function claimsById(section: Section): ReadonlyMap<string, Claim> {
  return new Map(section.claims.map((claim) => [claim.id, claim]));
}

function diffSection(prev: Section, next: Section): SectionDiff {
  const prevClaims = claimsById(prev);
  const nextClaims = claimsById(next);
  const addedClaimIds = next.claims.filter((claim) => !prevClaims.has(claim.id)).map((c) => c.id);
  const removedClaimIds = prev.claims.filter((claim) => !nextClaims.has(claim.id)).map((c) => c.id);
  const statusChanges: ClaimStatusChange[] = [];
  for (const claim of prev.claims) {
    const after = nextClaims.get(claim.id);
    if (after !== undefined && after.status !== claim.status) {
      statusChanges.push({ claimId: claim.id, from: claim.status, to: after.status });
    }
  }
  return {
    sectionId: prev.id,
    heading: next.heading,
    proseChanged: prev.prose !== next.prose,
    addedClaimIds,
    removedClaimIds,
    statusChanges,
  };
}

function isChanged(diff: SectionDiff): boolean {
  return (
    diff.proseChanged ||
    diff.addedClaimIds.length > 0 ||
    diff.removedClaimIds.length > 0 ||
    diff.statusChanges.length > 0
  );
}

export function diffSurveyVersions(prev: SurveyVersion, next: SurveyVersion): SurveyDiff {
  const prevSections = new Map(prev.sections.map((section) => [section.id, section]));
  const nextSections = new Map(next.sections.map((section) => [section.id, section]));
  const addedSectionIds = next.sections.filter((s) => !prevSections.has(s.id)).map((s) => s.id);
  const removedSectionIds = prev.sections.filter((s) => !nextSections.has(s.id)).map((s) => s.id);
  const changedSections = prev.sections
    .flatMap((section) => {
      const after = nextSections.get(section.id);
      return after === undefined ? [] : [diffSection(section, after)];
    })
    .filter(isChanged);
  const materialChange =
    addedSectionIds.length > 0 || removedSectionIds.length > 0 || changedSections.length > 0;
  return {
    fromVersion: prev.versionNumber,
    toVersion: next.versionNumber,
    addedSectionIds,
    removedSectionIds,
    changedSections,
    materialChange,
  };
}
