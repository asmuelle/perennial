import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  vector,
} from 'drizzle-orm/pg-core';

/**
 * Drizzle schema for the M0 baseline (DESIGN.md data model sketch).
 * Invariant-bearing constraints live here, not in the UI:
 * - claim provenance columns are NOT NULL + CHECK non-empty (invariant 2);
 * - citation verification columns record the resolution (invariant 1);
 * - survey versions are append-only (unique topic+version, no updated_at).
 */

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  plan: text('plan', { enum: ['free', 'individual', 'pro', 'lab_seat'] })
    .notNull()
    .default('free'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const topic = pgTable('topic', {
  id: text('id').primaryKey(),
  ownerUserId: text('owner_user_id')
    .notNull()
    .references(() => user.id),
  researchQuestion: text('research_question').notNull(),
  seedDraft: text('seed_draft'),
  fieldScope: jsonb('field_scope').notNull().$type<readonly string[]>(),
  status: text('status', { enum: ['active', 'paused', 'frozen'] })
    .notNull()
    .default('active'),
  weeklyBudgetCents: integer('weekly_budget_cents').notNull(),
  cadence: text('cadence').notNull().default('weekly'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const paper = pgTable(
  'paper',
  {
    id: text('id').primaryKey(),
    doi: text('doi'),
    arxivId: text('arxiv_id'),
    title: text('title').notNull(),
    authors: jsonb('authors').notNull().$type<readonly string[]>(),
    venue: text('venue'),
    publishedAt: timestamp('published_at', { withTimezone: true }).notNull(),
    abstract: text('abstract').notNull(),
    oaPdfUrl: text('oa_pdf_url'),
    fullTextStatus: text('full_text_status', { enum: ['oa_fulltext', 'abstract_only'] }).notNull(),
    integrityFlags: jsonb('integrity_flags').notNull().default(sql`'[]'::jsonb`),
    embedding: vector('embedding', { dimensions: 1024 }),
  },
  (table) => [
    check('paper_has_identifier', sql`${table.doi} IS NOT NULL OR ${table.arxivId} IS NOT NULL`),
  ],
);

export const surveyVersion = pgTable(
  'survey_version',
  {
    id: text('id').primaryKey(),
    topicId: text('topic_id')
      .notNull()
      .references(() => topic.id),
    versionNumber: integer('version_number').notNull(),
    createdByRunId: text('created_by_run_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('survey_version_topic_version_unique').on(table.topicId, table.versionNumber),
    check('survey_version_number_positive', sql`${table.versionNumber} >= 1`),
  ],
);

export const section = pgTable('section', {
  id: text('id').primaryKey(),
  surveyVersionId: text('survey_version_id')
    .notNull()
    .references(() => surveyVersion.id),
  heading: text('heading').notNull(),
  order: integer('order').notNull(),
  prose: text('prose').notNull(),
  affectedBy: jsonb('affected_by').notNull().default(sql`'[]'::jsonb`),
});

export const claim = pgTable(
  'claim',
  {
    id: text('id').primaryKey(),
    sectionId: text('section_id')
      .notNull()
      .references(() => section.id),
    text: text('text').notNull(),
    status: text('status', { enum: ['supported', 'contradicted', 'superseded', 'needs_review'] })
      .notNull()
      .default('needs_review'),
    // Invariant 2: pinned provenance is NOT NULL and non-empty at the DB layer.
    provenancePaperId: text('provenance_paper_id')
      .notNull()
      .references(() => paper.id),
    provenanceSectionLocator: text('provenance_section_locator').notNull(),
    provenanceQuotedSpan: text('provenance_quoted_span').notNull(),
    confidence: text('confidence', { enum: ['oa_fulltext', 'abstract_only'] }).notNull(),
  },
  (table) => [
    check(
      'claim_provenance_non_empty',
      sql`length(trim(${table.provenanceSectionLocator})) > 0 AND length(trim(${table.provenanceQuotedSpan})) > 0`,
    ),
  ],
);

export const citation = pgTable(
  'citation',
  {
    id: text('id').primaryKey(),
    claimId: text('claim_id')
      .notNull()
      .references(() => claim.id),
    paperId: text('paper_id')
      .notNull()
      .references(() => paper.id),
    doiOrArxivId: text('doi_or_arxiv_id').notNull(),
    // Invariant 1: the recorded resolution. Render layers refuse rows where these are NULL.
    verificationResolver: text('verification_resolver', { enum: ['crossref', 'arxiv'] }),
    verificationResolvedAt: timestamp('verification_resolved_at', { withTimezone: true }),
    verificationHttpStatus: integer('verification_http_status'),
  },
  (table) => [
    check(
      'citation_verification_all_or_none',
      sql`(${table.verificationResolver} IS NULL) = (${table.verificationResolvedAt} IS NULL) AND (${table.verificationResolver} IS NULL) = (${table.verificationHttpStatus} IS NULL)`,
    ),
  ],
);

export const pipelineRun = pgTable('pipeline_run', {
  id: text('id').primaryKey(),
  topicId: text('topic_id')
    .notNull()
    .references(() => topic.id),
  week: text('week').notNull(),
  counts: jsonb('counts').notNull(),
  costCents: integer('cost_cents').notNull(),
  modelVersions: jsonb('model_versions').notNull().$type<readonly string[]>(),
  status: text('status', { enum: ['succeeded', 'failed'] }).notNull(),
  error: text('error'),
  materialChange: boolean('material_change').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
