import type { PipelineRun, Result, SurveyVersion } from '@perennial/core';
import { INITIAL_SURVEY_BUDGET_CENTS, buildSurveyVersion, err, ok } from '@perennial/core';
import { bindDraftSections } from './bind';
import { dedupHarvest } from './dedup';
import { parseHarvest, parseTopic } from './ingest';
import type { IntegrityReport, ReferenceResolver } from './integrity';
import { screenRecordIntegrity } from './integrity';
import type { HarvestRecord, TopicFixture } from './schemas';
import type { SynthesisModel, SynthesisSectionInput } from './synthesize';
import type { TriageDecision, TriageModel } from './triage';

/** Flow 1 (DESIGN.md): question in → ingest → dedup → triage → integrity → synthesis → verified v1. */

export interface InitialSurveyDeps {
  readonly harvest: unknown;
  readonly topic: unknown;
  readonly resolver: ReferenceResolver;
  readonly triageModel: TriageModel;
  readonly synthesisModel: SynthesisModel;
  readonly nowIso: string;
  readonly runId: string;
}

export interface InitialSurveyOutput {
  readonly version: SurveyVersion;
  readonly run: PipelineRun;
  readonly triageDecisions: readonly TriageDecision[];
  readonly integrityReports: readonly IntegrityReport[];
}

function routeSections(
  topic: TopicFixture,
  records: readonly HarvestRecord[],
  decisions: ReadonlyMap<string, TriageDecision>,
): readonly SynthesisSectionInput[] {
  return topic.outlineHints
    .map((hint) => ({
      heading: hint.heading,
      papers: records.filter(
        (record) =>
          decisions.get(record.arxivId.replace(/v\d+$/, ''))?.routedHeading === hint.heading,
      ),
    }))
    .filter((section) => section.papers.length > 0);
}

export function runInitialSurvey(deps: InitialSurveyDeps): Result<InitialSurveyOutput> {
  const harvest = parseHarvest(deps.harvest);
  if (!harvest.ok) {
    return harvest;
  }
  const topic = parseTopic(deps.topic);
  if (!topic.ok) {
    return topic;
  }

  const { kept, removedCount } = dedupHarvest(harvest.value.records);
  const triage = deps.triageModel.triage(kept, topic.value);
  const decisionByBase = new Map(triage.decisions.map((d) => [d.arxivBaseId, d]));
  const relevant = kept.filter(
    (record) => decisionByBase.get(record.arxivId.replace(/v\d+$/, ''))?.relevant === true,
  );

  const integrityReports = relevant.map((record) => screenRecordIntegrity(record, deps.resolver));
  const okBases = new Set(integrityReports.filter((r) => r.ok).map((r) => r.arxivBaseId));
  const surviving = relevant.filter((record) =>
    okBases.has(record.arxivId.replace(/v\d+$/, '')),
  );

  const synthesis = deps.synthesisModel.synthesize(
    topic.value,
    routeSections(topic.value, surviving, decisionByBase),
  );
  const bound = bindDraftSections(synthesis.sections, surviving, deps.resolver, deps.nowIso);

  const costCents = triage.costCents + synthesis.costCents;
  if (costCents > INITIAL_SURVEY_BUDGET_CENTS) {
    return err(
      `initial survey cost ${costCents}c exceeds INITIAL_SURVEY_BUDGET_CENTS (${INITIAL_SURVEY_BUDGET_CENTS}c)`,
    );
  }

  const version = buildSurveyVersion({
    topicId: topic.value.id,
    versionNumber: 1,
    createdByRunId: deps.runId,
    createdAt: deps.nowIso,
    sections: bound.sections,
    citations: bound.citations,
    papers: bound.papers,
  });
  if (!version.ok) {
    return err(`survey version rejected: ${JSON.stringify(version.error)}`);
  }

  const run: PipelineRun = {
    id: deps.runId,
    topicId: topic.value.id,
    week: deps.nowIso.slice(0, 10),
    counts: {
      harvested: harvest.value.records.length,
      deduped: removedCount,
      triagedRelevant: relevant.length,
      integrityExcluded: relevant.length - surviving.length,
      integrated: bound.papers.length,
      claimsDropped: bound.dropped.length,
      citationsRejected: bound.citationsRejected,
    },
    costCents,
    modelVersions: [triage.modelVersion, synthesis.modelVersion],
    status: 'succeeded',
    error: null,
  };

  return ok({
    version: version.value,
    run,
    triageDecisions: triage.decisions,
    integrityReports,
  });
}
