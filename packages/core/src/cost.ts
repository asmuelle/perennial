/**
 * Hard cost caps (PRODUCT INVARIANT 5). All values are integer cents.
 * Targets come from DESIGN.md: triage ~$0.05/topic/week, integration $0.40–1.80/topic/week,
 * initial survey $3–8 one-time. Alert threshold is 2x target.
 */

export const INITIAL_SURVEY_BUDGET_CENTS = 800;

export const WEEKLY_TRIAGE_TARGET_CENTS = 5;

export const WEEKLY_INTEGRATION_TARGET_CENTS_MAX = 180;

export const WEEKLY_BUDGET_ALERT_MULTIPLIER = 2;

export const WEEKLY_TOPIC_BUDGET_CENTS =
  WEEKLY_BUDGET_ALERT_MULTIPLIER * (WEEKLY_TRIAGE_TARGET_CENTS + WEEKLY_INTEGRATION_TARGET_CENTS_MAX);

export function isOverBudget(costCents: number, budgetCents: number): boolean {
  return costCents > budgetCents;
}
