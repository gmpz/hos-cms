import { expect, test } from "@playwright/test";

for (const width of [390, 768, 1440]) {
  test(`หน้าข่าวไม่ล้นแนวนอนที่ ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const response = await page.goto("/news");

    expect(response?.ok()).toBeTruthy();
    await expect(page.getByRole("heading", { name: "ข่าวและผลงาน" })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);

    await page.screenshot({ path: testInfo.outputPath(`news-${width}.png`), fullPage: true });
  });
}
