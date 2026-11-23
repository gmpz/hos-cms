import { expect, test } from "@playwright/test";

let formNewsSlug = "";

test.beforeAll(async ({ request }) => {
  const response = await request.get("/api/posts/public-list?year=all");
  expect(response.ok()).toBeTruthy();
  const { items } = await response.json() as { items: { slug: string }[] };

  for (const { slug } of items) {
    const article = await request.get(`/news/${encodeURIComponent(slug)}`);
    if (!article.ok()) continue;
    const html = await article.text();
    if (html.includes("public-news-article form-news-article") &&
      html.includes("article-video-block") && html.includes("pdf-viewer") &&
      html.includes("article-attachment-block")) {
      formNewsSlug = slug;
      break;
    }
  }
  expect(formNewsSlug, "ต้องมีข่าวแบบฟอร์มที่เผยแพร่และมีวิดีโอ PDF และไฟล์แนบ").not.toBe("");
});

for (const width of [390, 768, 1440]) {
  test(`หน้ารายละเอียดข่าวแบบฟอร์มที่ ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const response = await page.goto(`/news/${encodeURIComponent(formNewsSlug)}`);

    expect(response?.ok()).toBeTruthy();
    const article = page.locator(".public-news-article.form-news-article");
    await expect(article.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(article.locator(".article-video-block")).toBeVisible();
    await expect(article.locator(".pdf-viewer")).toBeVisible();
    await expect(article.locator(".article-attachment-block")).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);

    const download = article.locator(".article-attachment-download").first();
    await expect(download).toBeVisible();
    if (width === 390) {
      await expect(download.locator("span")).toBeHidden();
      expect((await download.boundingBox())?.width).toBeLessThanOrEqual(44);
    }

    await page.screenshot({ path: testInfo.outputPath(`form-news-${width}.png`), fullPage: true });
  });
}
