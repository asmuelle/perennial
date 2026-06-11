import { arxivHarvestWeek, fixtureTopic } from '@perennial/fixtures';
import { unwrap } from '@perennial/core';
import { describe, expect, test } from 'vitest';
import { dedupHarvest } from './dedup';
import { parseHarvest, parseTopic } from './ingest';
import { createMockTriageModel, MOCK_TRIAGE_MODEL_VERSION } from './triage';

const topic = unwrap(parseTopic(fixtureTopic));
const { kept } = dedupHarvest(unwrap(parseHarvest(arxivHarvestWeek)).records);
const model = createMockTriageModel();

function decisionFor(baseId: string) {
  const decision = model.triage(kept, topic).decisions.find((d) => d.arxivBaseId === baseId);
  if (!decision) {
    throw new Error(`no decision for ${baseId}`);
  }
  return decision;
}

describe('mock triage model (cheap-model tier: relevance, slop, routing)', () => {
  test('routes the venue-audit paper to the prevalence section', () => {
    const decision = decisionFor('2601.11342');

    expect(decision.relevant).toBe(true);
    expect(decision.routedHeading).toBe('Prevalence and audits of fabricated citations');
  });

  test('routes the detection paper to the screening section', () => {
    const decision = decisionFor('2602.04891');

    expect(decision.relevant).toBe(true);
    expect(decision.routedHeading).toBe('Detection and screening at submission time');
  });

  test('routes span-grounding work to the claim-verification section', () => {
    expect(decisionFor('2603.02217').routedHeading).toBe(
      'Span-grounded generation and claim verification',
    );
    expect(decisionFor('2605.00321').routedHeading).toBe(
      'Span-grounded generation and claim verification',
    );
  });

  test('routes living-review maintenance work to the maintenance section', () => {
    expect(decisionFor('2602.09876').routedHeading).toBe('Maintaining living literature reviews');
  });

  test('excludes off-topic robotics and vision papers', () => {
    // Arrange + Act
    const robotics = decisionFor('2603.07712');
    const vision = decisionFor('2602.13990');

    // Assert
    expect(robotics.relevant).toBe(false);
    expect(robotics.routedHeading).toBeNull();
    expect(vision.relevant).toBe(false);
    expect(vision.keywordHits).toEqual([]);
  });

  test('screens the buzzword AI-slop survey out despite topical keywords', () => {
    const decision = decisionFor('2604.05521');

    expect(decision.slop).toBe(true);
    expect(decision.relevant).toBe(false);
  });

  test('is deterministic and records batch cost and model version', () => {
    // Act
    const first = model.triage(kept, topic);
    const second = model.triage(kept, topic);

    // Assert
    expect(first).toEqual(second);
    expect(first.costCents).toBeGreaterThan(0);
    expect(first.modelVersion).toBe(MOCK_TRIAGE_MODEL_VERSION);
    expect(first.decisions.filter((d) => d.relevant)).toHaveLength(8);
  });
});
