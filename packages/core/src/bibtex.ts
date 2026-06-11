import { gateRenderableCitations } from './citations';
import type { UnverifiedCitationError } from './citations';
import type { Result } from './result';
import { err, ok } from './result';
import type { Citation, PaperRef } from './types';

/**
 * Deterministic BibTeX generation (PRODUCT INVARIANT 3): generated from verified
 * citation rows and paper metadata only — never from model output. Refuses to
 * emit anything if a single citation is unverified (PRODUCT INVARIANT 1).
 */

export type BibtexError = UnverifiedCitationError | { readonly reason: 'unknown_paper'; readonly paperId: string };

function lastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1] ?? fullName;
}

export function bibtexKey(paper: PaperRef): string {
  const author = lastName(paper.authors[0] ?? 'anon').toLowerCase().replace(/[^a-z]/g, '');
  const firstWord =
    paper.title
      .toLowerCase()
      .split(/\s+/)
      .map((word) => word.replace(/[^a-z]/g, ''))
      .find((word) => word.length > 3) ?? 'untitled';
  return `${author}${paper.year}${firstWord}`;
}

function bibtexEntry(paper: PaperRef, citation: Citation): string {
  const idLine =
    paper.doi !== null
      ? `  doi = {${paper.doi}},`
      : `  eprint = {${paper.arxivId ?? citation.doiOrArxivId}},\n  archiveprefix = {arXiv},`;
  const verifiedNote = citation.verification
    ? `  note = {Reference verified via ${citation.verification.resolver} on ${citation.verification.resolvedAt.slice(0, 10)}},`
    : '';
  return [
    `@article{${bibtexKey(paper)},`,
    `  title = {{${paper.title}}},`,
    `  author = {${paper.authors.join(' and ')}},`,
    `  year = {${paper.year}},`,
    idLine,
    verifiedNote,
    `}`,
  ]
    .filter((line) => line.length > 0)
    .join('\n');
}

/** One entry per unique cited paper, sorted by key for byte-stable output. */
export function toBibtex(
  citations: readonly Citation[],
  papers: readonly PaperRef[],
): Result<string, BibtexError> {
  const gated = gateRenderableCitations(citations);
  if (!gated.ok) {
    return err(gated.error);
  }
  const paperById = new Map(papers.map((paper) => [paper.id, paper]));
  const seen = new Set<string>();
  const entries: { key: string; text: string }[] = [];
  for (const citation of gated.value) {
    if (seen.has(citation.paperId)) {
      continue;
    }
    seen.add(citation.paperId);
    const paper = paperById.get(citation.paperId);
    if (paper === undefined) {
      return err({ reason: 'unknown_paper', paperId: citation.paperId });
    }
    entries.push({ key: bibtexKey(paper), text: bibtexEntry(paper, citation) });
  }
  const sorted = [...entries].sort((a, b) => a.key.localeCompare(b.key));
  return ok(sorted.map((entry) => entry.text).join('\n\n') + '\n');
}
