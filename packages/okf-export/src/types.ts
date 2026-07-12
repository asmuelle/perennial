import type { PipelineRun, SurveyVersion } from '@perennial/core';
import type { LintFinding } from '@okf/core';

export interface SurveyExportInput {
  readonly survey: SurveyVersion;
  /** Pipeline runs for the topic, oldest first — the source of log.md (may be empty). */
  readonly runs: readonly PipelineRun[];
  /** App origin for `resource:` deep links (section anchors), no trailing slash. */
  readonly baseUrl: string;
}

/**
 * The projection result. Perennial's render layer refuses unverified citations (invariant 1); the
 * projector re-asserts it — a claim cited by an unverified citation yields an UNVERIFIED_CITATION
 * error finding and its citation is kept out of the bundle. Any error finding means don't ship.
 */
export interface SurveyBundle {
  readonly files: ReadonlyMap<string, string>;
  readonly findings: readonly LintFinding[];
}
