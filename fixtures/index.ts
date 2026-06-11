/**
 * Checked-in fixture corpus for the M1 vertical slice.
 *
 * Everything is exported as `unknown` on purpose: consumers must validate at the
 * boundary (zod schemas in @perennial/pipeline) before touching the data —
 * fixtures simulate untrusted upstream API responses.
 */
import harvestJson from './arxiv/harvest-2026-06-01.json';
import injectedFakeDoiJson from './arxiv/injected-fake-doi.json';
import registryJson from './registry/resolver-registry.json';
import topicJson from './topics/citation-integrity.json';

/** One week of raw arXiv harvest records (realistic OAI/RSS-shaped documents). */
export const arxivHarvestWeek: unknown = harvestJson;

/** A single harvest record whose own DOI and arXiv ID resolve nowhere — invariant-1 attack fixture. */
export const injectedFakeDoiHarvest: unknown = injectedFakeDoiJson;

/** Frozen Crossref/arXiv resolution snapshot backing the deterministic fixture resolver. */
export const resolverRegistry: unknown = registryJson;

/** The seeded research topic for the slice. */
export const fixtureTopic: unknown = topicJson;

/** Deterministic clock used by the slice so output is reproducible byte-for-byte. */
export const FIXTURE_NOW_ISO = '2026-06-08T00:00:00.000Z';
