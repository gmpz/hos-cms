import { expect, test } from '@playwright/test';
for (const width of [390, 768, 1440]) test(`documents index uses shared cards at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height:900 });
  await page.goto('/documents');
  await expect(page.locator('.document-block-list').first()).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  await expect(page.locator('.public-document-index .public-document-row')).toHaveCount(0);
});
