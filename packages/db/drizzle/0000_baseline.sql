-- Perennial M0 baseline migration (hand-maintained, mirrors src/schema.ts).
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS "user" (
  id text PRIMARY KEY,
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  plan text NOT NULL DEFAULT 'free',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS topic (
  id text PRIMARY KEY,
  owner_user_id text NOT NULL REFERENCES "user"(id),
  research_question text NOT NULL,
  seed_draft text,
  field_scope jsonb NOT NULL,
  status text NOT NULL DEFAULT 'active',
  weekly_budget_cents integer NOT NULL,
  cadence text NOT NULL DEFAULT 'weekly',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS paper (
  id text PRIMARY KEY,
  doi text,
  arxiv_id text,
  title text NOT NULL,
  authors jsonb NOT NULL,
  venue text,
  published_at timestamptz NOT NULL,
  abstract text NOT NULL,
  oa_pdf_url text,
  full_text_status text NOT NULL,
  integrity_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  embedding vector(1024),
  CONSTRAINT paper_has_identifier CHECK (doi IS NOT NULL OR arxiv_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS survey_version (
  id text PRIMARY KEY,
  topic_id text NOT NULL REFERENCES topic(id),
  version_number integer NOT NULL,
  created_by_run_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT survey_version_number_positive CHECK (version_number >= 1)
);
CREATE UNIQUE INDEX IF NOT EXISTS survey_version_topic_version_unique
  ON survey_version (topic_id, version_number);

CREATE TABLE IF NOT EXISTS section (
  id text PRIMARY KEY,
  survey_version_id text NOT NULL REFERENCES survey_version(id),
  heading text NOT NULL,
  "order" integer NOT NULL,
  prose text NOT NULL,
  affected_by jsonb NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS claim (
  id text PRIMARY KEY,
  section_id text NOT NULL REFERENCES section(id),
  text text NOT NULL,
  status text NOT NULL DEFAULT 'needs_review',
  provenance_paper_id text NOT NULL REFERENCES paper(id),
  provenance_section_locator text NOT NULL,
  provenance_quoted_span text NOT NULL,
  confidence text NOT NULL,
  CONSTRAINT claim_provenance_non_empty CHECK (
    length(trim(provenance_section_locator)) > 0
    AND length(trim(provenance_quoted_span)) > 0
  )
);

CREATE TABLE IF NOT EXISTS citation (
  id text PRIMARY KEY,
  claim_id text NOT NULL REFERENCES claim(id),
  paper_id text NOT NULL REFERENCES paper(id),
  doi_or_arxiv_id text NOT NULL,
  verification_resolver text,
  verification_resolved_at timestamptz,
  verification_http_status integer,
  CONSTRAINT citation_verification_all_or_none CHECK (
    (verification_resolver IS NULL) = (verification_resolved_at IS NULL)
    AND (verification_resolver IS NULL) = (verification_http_status IS NULL)
  )
);

CREATE TABLE IF NOT EXISTS pipeline_run (
  id text PRIMARY KEY,
  topic_id text NOT NULL REFERENCES topic(id),
  week text NOT NULL,
  counts jsonb NOT NULL,
  cost_cents integer NOT NULL,
  model_versions jsonb NOT NULL,
  status text NOT NULL,
  error text,
  material_change boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
