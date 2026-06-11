import { unwrap } from '@perennial/core';
import {
  FIXTURE_NOW_ISO,
  arxivHarvestWeek,
  fixtureTopic,
  resolverRegistry,
} from '@perennial/fixtures';
import { parseResolverRegistry } from './ingest';
import { createFixtureResolver } from './integrity';
import type { InitialSurveyOutput } from './run';
import { runInitialSurvey } from './run';
import { createMockSynthesisModel } from './synthesize';
import { createMockTriageModel } from './triage';

export const FIXTURE_RUN_ID = 'run-fixture-2026-06-08';

/**
 * The M1 vertical slice: runs Flow 1 end-to-end on the checked-in fixture
 * corpus with deterministic mock models. No network, no database, no API keys.
 * Output is byte-stable across runs — apps/web renders it at build time.
 */
export function runFixtureSlice(): InitialSurveyOutput {
  const registry = unwrap(parseResolverRegistry(resolverRegistry));
  return unwrap(
    runInitialSurvey({
      harvest: arxivHarvestWeek,
      topic: fixtureTopic,
      resolver: createFixtureResolver(registry),
      triageModel: createMockTriageModel(),
      synthesisModel: createMockSynthesisModel(),
      nowIso: FIXTURE_NOW_ISO,
      runId: FIXTURE_RUN_ID,
    }),
  );
}
