import { expect, test } from '@playwright/test';

test('renders the verified survey with claim provenance (M1 accept)', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('h1')).toContainText('fabricated references');
  await expect(page.locator('.claim')).toHaveCount(8);
  await expect(page.locator('.trust-line')).toContainText('references verified');

  // 100% of rendered citations show a recorded resolution
  await expect(page.locator('.verification-line')).toHaveCount(8);

  // provenance popover exposes the quoted span
  const firstProvenance = page.locator('.provenance').first();
  await firstProvenance.locator('summary').click();
  await expect(firstProvenance.locator('.provenance-quote')).toBeVisible();
});

test('the injected fake DOI never reaches the rendered survey (invariant 1)', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('body')).not.toContainText('perennial.fake');
  await expect(page.locator('body')).not.toContainText('2699.99999');
});

test('BibTeX export lists only verified entries', async ({ page }) => {
  await page.goto('/');

  const bibtex = page.locator('.bibtex pre');
  await expect(bibtex).toContainText('@article{');
  await expect(bibtex).toContainText('Reference verified via');
  await expect(bibtex).not.toContainText('perennial.fake');
});
