import { gateRenderableCitations, toBibtex, unwrap } from '@perennial/core';
import { fixtureTopic } from '@perennial/fixtures';
import { parseTopic, runFixtureSlice } from '@perennial/pipeline';
import { ClaimItem } from '@/components/survey/ClaimItem';
import { RunAudit } from '@/components/survey/RunAudit';
import { formatVerifiedDate } from '@/lib/labels';

/**
 * Read-only reader for the M1 slice. The survey is computed deterministically
 * at build time from checked-in fixtures — no network, no database, no keys.
 * Render REFUSES unverified citations (invariant 1): the gate below throws
 * at build time if a single unverified citation slips through.
 */
export default function SurveyPage() {
  const { version, run } = runFixtureSlice();
  const topic = unwrap(parseTopic(fixtureTopic));
  const citations = unwrap(gateRenderableCitations(version.citations));
  const citationByClaim = new Map(citations.map((citation) => [citation.claimId, citation]));
  const paperById = new Map(version.papers.map((paper) => [paper.id, paper]));
  const bibtex = unwrap(toBibtex(version.citations, version.papers));
  const verifiedDate = formatVerifiedDate(version.createdAt);

  return (
    <>
      <header className="masthead">
        <span className="masthead-brand">
          <span className="leaf">❦</span> Perennial
        </span>
        <p className="trust-line">
          <strong>✓ All {citations.length} references verified</strong> · current as of{' '}
          {verifiedDate}
        </p>
      </header>
      <main className="sheet">
        <article aria-labelledby="survey-heading">
          <header className="survey-header">
            <p className="survey-kicker">Living literature review · Version {version.versionNumber}</p>
            <h1 id="survey-heading" className="survey-title">
              {topic.researchQuestion}
            </h1>
            <ul className="survey-meta">
              <li>
                Topic <code>{version.topicId}</code>
              </li>
              <li>
                Run <code>{version.createdByRunId}</code>
              </li>
              <li>{version.sections.length} sections</li>
              <li>{version.papers.length} papers integrated</li>
            </ul>
          </header>
          {version.sections.map((section, index) => (
            <section key={section.id} className="survey-section" aria-labelledby={section.id}>
              <h2 className="section-heading" id={section.id}>
                <span className="section-number">§{index + 1}</span>
                {section.heading}
              </h2>
              <p className="section-prose">{section.prose}</p>
              <ol className="claim-list">
                {section.claims.map((claim) => {
                  const citation = citationByClaim.get(claim.id);
                  const paper = paperById.get(claim.provenance.paperId);
                  if (citation === undefined || paper === undefined) {
                    throw new Error(`claim ${claim.id} is missing a verified citation or paper`);
                  }
                  return (
                    <ClaimItem key={claim.id} claim={claim} paper={paper} citation={citation} />
                  );
                })}
              </ol>
            </section>
          ))}
          <RunAudit run={run} bibtex={bibtex} />
        </article>
      </main>
    </>
  );
}
