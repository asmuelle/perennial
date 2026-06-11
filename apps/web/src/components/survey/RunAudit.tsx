import type { PipelineRun } from '@perennial/core';
import { formatCostUsd } from '@/lib/labels';

/** Auditable pipeline trail (invariant 9) plus the deterministic BibTeX export. */
export function RunAudit({ run, bibtex }: { readonly run: PipelineRun; readonly bibtex: string }) {
  const { counts } = run;
  return (
    <footer className="run-audit" aria-label="Pipeline run audit">
      <dl>
        <div>
          <dt>Harvested</dt>
          <dd>{counts.harvested}</dd>
        </div>
        <div>
          <dt>Deduplicated</dt>
          <dd>{counts.deduped}</dd>
        </div>
        <div>
          <dt>Triaged relevant</dt>
          <dd>{counts.triagedRelevant}</dd>
        </div>
        <div>
          <dt>Integrity-excluded</dt>
          <dd>{counts.integrityExcluded}</dd>
        </div>
        <div>
          <dt>Integrated</dt>
          <dd>{counts.integrated}</dd>
        </div>
        <div>
          <dt>Run cost</dt>
          <dd>{formatCostUsd(run.costCents)}</dd>
        </div>
        <div>
          <dt>Models</dt>
          <dd>{run.modelVersions.join(', ')}</dd>
        </div>
      </dl>
      <details className="bibtex">
        <summary>Export BibTeX — verified citations only</summary>
        <pre>{bibtex}</pre>
      </details>
    </footer>
  );
}
