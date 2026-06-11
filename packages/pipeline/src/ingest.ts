import type { Result } from '@perennial/core';
import { err, ok } from '@perennial/core';
import type { ZodType } from 'zod';
import type { HarvestFile, ResolverRegistry, TopicFixture } from './schemas';
import { harvestFileSchema, resolverRegistrySchema, topicSchema } from './schemas';

function parseWith<T>(schema: ZodType<T>, input: unknown, label: string): Result<T> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    return err(`invalid ${label}: ${issues}`);
  }
  return ok(parsed.data);
}

/** Validates a raw arXiv harvest payload at the boundary. */
export function parseHarvest(input: unknown): Result<HarvestFile> {
  return parseWith(harvestFileSchema, input, 'harvest payload');
}

/** Validates a topic definition at the boundary. */
export function parseTopic(input: unknown): Result<TopicFixture> {
  return parseWith(topicSchema, input, 'topic');
}

/** Validates the frozen resolver registry snapshot at the boundary. */
export function parseResolverRegistry(input: unknown): Result<ResolverRegistry> {
  return parseWith(resolverRegistrySchema, input, 'resolver registry');
}
