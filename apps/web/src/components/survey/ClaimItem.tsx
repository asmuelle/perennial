import type { Citation, Claim, PaperRef } from '@perennial/core';
import { confidenceLabel, formatAuthors, formatVerifiedDate, statusLabel } from '@/lib/labels';

interface ClaimItemProps {
  readonly claim: Claim;
  readonly paper: PaperRef;
  readonly citation: Citation;
}

/** One claim with its margin mark, status chip, and footnote-style provenance. */
export function ClaimItem({ claim, paper, citation }: ClaimItemProps) {
  const confidence = confidenceLabel(claim.confidence);
  const verification = citation.verification;
  return (
    <li className="claim" data-status={claim.status}>
      <p className="claim-text">{claim.text}</p>
      <p className="claim-tags">
        <span className="status-chip">{statusLabel(claim.status)}</span>
        {confidence !== null && <span className="confidence-chip">{confidence}</span>}
      </p>
      <details className="provenance">
        <summary>Provenance — quoted span and verified reference</summary>
        <div className="provenance-note">
          <blockquote className="provenance-quote">“{claim.provenance.quotedSpan}”</blockquote>
          <p className="provenance-source">
            {formatAuthors(paper.authors)} ({paper.year}). <em>{paper.title}</em>. Locator:{' '}
            {claim.provenance.sectionLocator}.{' '}
            <span className="ids">{citation.doiOrArxivId}</span>
          </p>
          {verification !== null && (
            <p className="verification-line">
              ✓ Reference verified via <code>{verification.resolver}</code> on{' '}
              {formatVerifiedDate(verification.resolvedAt)} (HTTP {verification.httpStatus})
            </p>
          )}
        </div>
      </details>
    </li>
  );
}
