import { expect, test } from "@playwright/test";

test("news image skeleton fills its cover while image bytes are pending", async ({ page }) => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/*", async (route) => {
    if (route.request().resourceType() === "image") {
      await pending;
      await route.fulfill({ contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aS1cAAAAASUVORK5CYII=", "base64") });
    } else await route.continue();
  });
  try {
    await page.goto("/news", { waitUntil: "domcontentloaded" });
    const loader = page.locator(".public-news-index-cover > .public-image-loading.pending").first();
    await expect(loader).toBeVisible();
    const geometry = await loader.evaluate((element) => {
      const parent = element.parentElement!;
      const rect = element.getBoundingClientRect();
      const cover = parent.getBoundingClientRect();
      const style = getComputedStyle(element);
      return { left: rect.left - cover.left, top: rect.top - cover.top,
        width: rect.width - parent.clientWidth, height: rect.height - parent.clientHeight,
        radius: style.borderRadius, padding: style.padding, shadow: style.boxShadow };
    });
    expect(Math.abs(geometry.left)).toBeLessThanOrEqual(1);
    expect(Math.abs(geometry.top)).toBeLessThanOrEqual(1);
    expect(Math.abs(geometry.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(geometry.height)).toBeLessThanOrEqual(1);
    expect(geometry.radius).not.toBe("999px");
    expect(geometry.padding).toBe("0px");
    expect(geometry.shadow).toBe("none");
    release();
  } finally { release(); }
});
