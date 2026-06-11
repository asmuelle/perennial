import { z } from 'zod';

/**
 * Boundary validation (AGENTS.md: never trust upstream data). Every fixture or
 * API payload entering the pipeline is parsed with these schemas first.
 */

export const harvestRecordSchema = z.object({
  arxivId: z.string().regex(/^\d{4}\.\d{4,5}v\d+$/, 'expected an arXiv id like 2602.04891v1'),
  doi: z.string().min(3).nullable(),
  title: z.string().min(1),
  authors: z.array(z.object({ name: z.string().min(1) })).min(1),
  abstract: z.string().min(1),
  categories: z.array(z.string().min(1)).min(1),
  publishedAt: z.string().datetime(),
  oaPdfUrl: z.string().url().nullable(),
  references: z.array(z.string().min(1)),
});

export const harvestFileSchema = z.object({
  source: z.literal('arxiv'),
  harvestedAt: z.string().datetime(),
  records: z.array(harvestRecordSchema),
});

export const outlineHintSchema = z.object({
  heading: z.string().min(1),
  keywords: z.array(z.string().min(1)).min(1),
});

export const topicSchema = z.object({
  id: z.string().min(1),
  researchQuestion: z.string().min(1),
  fieldScope: z.array(z.string().min(1)).min(1),
  seedDraft: z.string().nullable(),
  status: z.enum(['active', 'paused', 'frozen']),
  weeklyBudgetCents: z.number().int().positive(),
  cadence: z.string().min(1),
  outlineHints: z.array(outlineHintSchema).min(1),
});

const registryEntrySchema = z.object({ title: z.string(), httpStatus: z.number().int() });

export const resolverRegistrySchema = z.object({
  describedAs: z.string(),
  snapshotAt: z.string(),
  arxiv: z.record(z.string(), registryEntrySchema),
  doi: z.record(z.string(), registryEntrySchema),
});

export type HarvestRecord = z.infer<typeof harvestRecordSchema>;
export type HarvestFile = z.infer<typeof harvestFileSchema>;
export type OutlineHint = z.infer<typeof outlineHintSchema>;
export type TopicFixture = z.infer<typeof topicSchema>;
export type ResolverRegistry = z.infer<typeof resolverRegistrySchema>;
