import type { Citation, PaperRef } from '@perennial/core';
import {
  buildBundle,
  generateIndex,
  generateLog,
  validateBundle,
  type ConceptDoc,
  type IndexEntry,
  type LintFinding,
  type LogEntry,
} from '@okf/core';
import { paperDoc, paperPath, sectionDoc, sectionPath } from './render';
import type { SurveyBundle, SurveyExportInput } from './types';

/**
 * Project one immutable survey version into an OKF bundle: one concept doc per section (prose +
 * per-claim pinned provenance + verified citation), one per cited paper, plus `index.md` and a
 * `log.md` built from the version's pipeline runs. Pure and byte-deterministic. A claim cited by an
 * unverified citation produces an error finding and its citation is withheld (projection-only rule).
 */
export const projectSurveyBundle = (input: SurveyExportInput): SurveyBundle => {
  const { survey } = input;
  const citationByClaim: ReadonlyMap<string, Citation> = new Map(
    survey.citations.map((c) => [c.claimId, c]),
  );
  const papersById: ReadonlyMap<string, PaperRef> = new Map(survey.papers.map((p) => [p.id, p]));

  const docs: ConceptDoc[] = [];
  const findings: LintFinding[] = [];
  const indexEntries: IndexEntry[] = [];

  const sections = [...survey.sections].sort((a, b) =>
    sectionPath(a) < sectionPath(b) ? -1 : 1,
  );
  for (const section of sections) {
    const result = sectionDoc(section, input.baseUrl, citationByClaim, papersById);
    docs.push(result.doc);
    findings.push(...result.findings);
    indexEntries.push({ path: result.doc.path, title: section.heading });
  }

  const papers = [...survey.papers].sort((a, b) => (paperPath(a) < paperPath(b) ? -1 : 1));
  for (const paper of papers) {
    const doc = paperDoc(paper);
    docs.push(doc);
    indexEntries.push({ path: doc.path, title: paper.title });
  }

  docs.push(
    generateIndex({
      title: `Survey v${survey.versionNumber} — ${survey.topicId}`,
      description:
        'OKF bundle projected from an immutable, citation-verified literature survey version. See log.md for the run history.',
      entries: indexEntries,
    }),
    generateLog(runLog(input)),
  );

  return {
    files: buildBundle(docs),
    findings: [...findings, ...validateBundle(docs)],
  };
};

/** log.md: the version creation, then one entry per pipeline run (in given order). */
const runLog = (input: SurveyExportInput): LogEntry[] => {
  const { survey, runs } = input;
  const entries: LogEntry[] = [
    {
      timestamp: survey.createdAt,
      summary: `Survey version ${survey.versionNumber} created by run ${survey.createdByRunId} (${survey.sections.length} sections, ${survey.papers.length} papers).`,
    },
  ];
  for (const run of runs) {
    const c = run.counts;
    entries.push({
      timestamp: run.week,
      summary: `Run ${run.id} (${run.status}): ${c.integrated} integrated, ${c.claimsDropped} claims dropped, ${c.citationsRejected} citations rejected.`,
      details: [
        `harvested ${c.harvested}, deduped ${c.deduped}, triaged-relevant ${c.triagedRelevant}`,
        `models ${run.modelVersions.join(', ')}`,
      ],
    });
  }
  return entries;
};
