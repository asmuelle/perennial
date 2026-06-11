import { describe, expect, test } from 'vitest';
import {
  INITIAL_SURVEY_BUDGET_CENTS,
  WEEKLY_BUDGET_ALERT_MULTIPLIER,
  WEEKLY_INTEGRATION_TARGET_CENTS_MAX,
  WEEKLY_TOPIC_BUDGET_CENTS,
  WEEKLY_TRIAGE_TARGET_CENTS,
  isOverBudget,
} from './cost';

describe('cost caps (invariant 5: hard, named budget constants)', () => {
  test('weekly topic budget derives from the DESIGN.md targets and alert multiplier', () => {
    // Arrange + Act + Assert
    expect(WEEKLY_TOPIC_BUDGET_CENTS).toBe(
      WEEKLY_BUDGET_ALERT_MULTIPLIER *
        (WEEKLY_TRIAGE_TARGET_CENTS + WEEKLY_INTEGRATION_TARGET_CENTS_MAX),
    );
    expect(WEEKLY_TOPIC_BUDGET_CENTS).toBe(370);
  });

  test('initial survey budget matches the README $8 cap', () => {
    expect(INITIAL_SURVEY_BUDGET_CENTS).toBe(800);
  });

  test('isOverBudget is exclusive at the cap', () => {
    expect(isOverBudget(WEEKLY_TOPIC_BUDGET_CENTS, WEEKLY_TOPIC_BUDGET_CENTS)).toBe(false);
    expect(isOverBudget(WEEKLY_TOPIC_BUDGET_CENTS + 1, WEEKLY_TOPIC_BUDGET_CENTS)).toBe(true);
  });
});
