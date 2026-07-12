import type { Citation, Claim, PaperRef, Section } from '@perennial/core';
import { isVerifiedCitation } from '@perennial/core';
import { markdownLink, slugify, type ConceptDoc, type LintFinding } from '@okf/core';

/** Section-page path: `sections/<zero-padded-order>-<heading-slug>.md`, order-sorted by construction. */
export const sectionPath = (section: Section): string =>
  `sections/${String(section.order).padStart(2, '0')}-${slugify(section.heading)}.md`;

/** Paper-page path: `papers/<id-slug>.md`. */
export const paperPath = (paper: PaperRef): string => `papers/${slugify(paper.id)}.md`;

/** In-app anchor for a section (mirrors the web reader's `section-<slug>` id). */
export const sectionAnchor = (section: Section): string => `section-${slugify(section.heading)}`;

const paperIdentifier = (paper: PaperRef): string => {
  if (paper.doi !== null) return `doi:${paper.doi}`;
  if (paper.arxivId !== null) return `arXiv:${paper.arxivId}`;
  return paper.id;
};

export interface SectionDocResult {
  readonly doc: ConceptDoc;
  readonly findings: readonly LintFinding[];
}

/**
 * Project one survey section into a concept doc: prose + one block per claim with its pinned
 * provenance (quoted span, locator, paper link) and, only when the citation verifies, the
 * resolution line. A missing or unverified citation yields an UNVERIFIED_CITATION error finding.
 */
export const sectionDoc = (
  section: Section,
  baseUrl: string,
  citationByClaim: ReadonlyMap<string, Citation>,
  papersById: ReadonlyMap<string, PaperRef>,
): SectionDocResult => {
  const path = sectionPath(section);
  const findings: LintFinding[] = [];
  const parts: string[] = [section.prose.trim()];

  if (section.claims.length > 0) {
    parts.push('## Claims');
    for (const claim of section.claims) {
      parts.push(renderClaim(claim, path, citationByClaim, papersById, findings));
    }
  }
  parts.push(markdownLink('← Survey', path, 'index.md'));

  return {
    doc: {
      path,
      frontmatter: {
        type: 'Survey Section',
        title: section.heading,
        resource: `${baseUrl}/#${sectionAnchor(section)}`,
        extra: { order: String(section.order) },
      },
      body: parts.join('\n\n'),
    },
    findings,
  };
};

const renderClaim = (
  claim: Claim,
  fromPath: string,
  citationByClaim: ReadonlyMap<string, Citation>,
  papersById: ReadonlyMap<string, PaperRef>,
  findings: LintFinding[],
): string => {
  const paper = papersById.get(claim.provenance.paperId);
  const paperLabel =
    paper === undefined
      ? claim.provenance.paperId
      : markdownLink(paper.title, fromPath, paperPath(paper));
  const lines = [
    `### ${claim.text}`,
    `- Status: ${claim.status}`,
    `- Provenance: "${claim.provenance.quotedSpan.trim()}" — ${claim.provenance.sectionLocator} in ${paperLabel}`,
  ];

  const citation = citationByClaim.get(claim.id);
  if (citation === undefined) {
    findings.push({
      check: 'UNVERIFIED_CITATION',
      severity: 'error',
      path: fromPath,
      message: `claim ${claim.id} has no citation`,
    });
  } else if (!isVerifiedCitation(citation)) {
    findings.push({
      check: 'UNVERIFIED_CITATION',
      severity: 'error',
      path: fromPath,
      message: `claim ${claim.id} is cited by an unverified citation (${citation.id})`,
    });
  } else {
    const v = citation.verification!;
    lines.push(
      `- Citation: ${citation.doiOrArxivId} (resolver ${v.resolver}, HTTP ${v.httpStatus}, resolved ${v.resolvedAt})`,
    );
  }
  return lines.join('\n');
};

/** Project one paper into a concept doc. */
export const paperDoc = (paper: PaperRef): ConceptDoc => ({
  path: paperPath(paper),
  frontmatter: {
    type: 'Paper',
    title: paper.title,
    tags: [paper.fullTextStatus],
    extra: { identifier: paperIdentifier(paper), year: String(paper.year) },
  },
  body: [
    `- Authors: ${paper.authors.join(', ')}`,
    `- Year: ${paper.year}`,
    `- Identifier: ${paperIdentifier(paper)}`,
    `- Full text: ${paper.fullTextStatus}`,
    '',
    markdownLink('← Survey', paperPath(paper), 'index.md'),
  ].join('\n'),
});
