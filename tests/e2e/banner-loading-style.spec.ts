import { expect, test } from "@playwright/test";

test("banner skeleton stays above image layers and respects reduced motion", async ({ page }) => {
  await page.goto("/news", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    const fixture = document.createElement("div");
    fixture.className = "banner-slider banner-presentation-imageOnly banner-height-standard";
    fixture.innerHTML = '<div class="banner-slider-track"><div class="banner-slide has-media"><span class="public-image-loading pending"></span><div class="banner-image-placeholder"></div></div></div>';
    document.body.prepend(fixture);
  });
  const loader = page.locator(".banner-slide>.public-image-loading").first();
  await expect(loader).toBeVisible();
  const state = await loader.evaluate((element) => ({
    loader: Number(getComputedStyle(element).zIndex),
    image: Number(getComputedStyle(element.nextElementSibling!).zIndex),
    animation: getComputedStyle(element, "::after").animationName,
    width: element.getBoundingClientRect().width,
    parentWidth: element.parentElement!.getBoundingClientRect().width,
  }));
  expect(state.loader).toBeGreaterThan(state.image);
  expect(state.animation).toBe("banner-image-shimmer");
  expect(state.width).toBe(state.parentWidth);
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await loader.evaluate((element) => getComputedStyle(element, "::after").animationName)).toBe("none");
});

test("banner copy reserves space while pending and appears after loading", async ({ page }) => {
  await page.goto("/news", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    const fixture = document.createElement("div");
    fixture.id = "banner-copy-test";
    fixture.className = "banner-slider banner-presentation-content banner-height-standard";
    fixture.innerHTML = '<div class="banner-slider-track"><div class="banner-slide has-media" aria-hidden="false"><span class="public-image-loading pending"></span><div class="banner-content"><h1>บริการสุขภาพ</h1><p>รายละเอียดบริการ</p></div></div></div><div class="banner-dots"><button class="active"></button></div>';
    document.body.prepend(fixture);
  });
  const heading = page.locator("#banner-copy-test h1");
  const description = page.locator("#banner-copy-test p");
  await expect(heading).toBeHidden();
  const before = await heading.evaluate(el => el.getBoundingClientRect().toJSON());
  await expect(description).toHaveCSS("color", "rgb(55, 65, 81)");
  await expect(page.locator("#banner-copy-test .banner-dots .active")).toHaveCSS("background-color", "rgb(55, 65, 81)");
  await page.locator("#banner-copy-test .public-image-loading").evaluate(element => element.remove());
  await expect(heading).toBeVisible();
  expect(await heading.evaluate(el => el.getBoundingClientRect().toJSON())).toEqual(before);
  await expect(heading).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(description).not.toHaveCSS("color", "rgb(55, 65, 81)");
});

test("narrow text banner controls have their own bottom row", async ({ page }) => {
  await page.goto("/news", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    const fixture = document.createElement("div");
    fixture.id = "banner-controls-test";
    fixture.className = "banner-slider banner-presentation-content banner-height-standard";
    fixture.style.width = "350px";
    fixture.innerHTML = '<div class="banner-slider-track"><div class="banner-slide has-media content-position-center"><div class="banner-content"><h1>บริการสุขภาพ</h1><p>รายละเอียดบริการของโรงพยาบาล</p></div></div></div><button class="banner-arrow previous">←</button><button class="banner-arrow next">→</button><div class="banner-dots"><button class="active"></button></div>';
    document.body.prepend(fixture);
  });
  const positions = await page.locator("#banner-controls-test").evaluate(element => {
    const content = element.querySelector(".banner-content")!.getBoundingClientRect();
    const arrow = element.querySelector(".banner-arrow")!.getBoundingClientRect();
    const dots = element.querySelector(".banner-dots")!.getBoundingClientRect();
    return { contentBottom: content.bottom, arrowTop: arrow.top, arrowRight: arrow.right, dotsLeft: dots.left };
  });
  expect(positions.contentBottom).toBeLessThanOrEqual(positions.arrowTop);
  expect(positions.arrowRight).toBeLessThan(positions.dotsLeft);
});

for (const width of [350, 680, 1000]) test(`long slim banner fits at ${width}px`, async ({ page }) => {
  await page.goto('/news', { waitUntil: 'domcontentloaded' });
  const bounds = await page.evaluate((width) => {
    const el = document.createElement('div');
    el.className = 'banner-slider banner-presentation-content banner-height-slim';
    el.style.width = `${width}px`;
    el.innerHTML = '<div class="banner-slider-track"><div class="banner-slide has-media content-position-center"><div class="banner-content"><h1>Hospital services</h1><p></p></div></div></div><button class="banner-arrow previous">prev</button>';
    el.querySelector('p')!.textContent = 'Hospital information and patient services. '.repeat(35);
    document.body.prepend(el);
    const content = el.querySelector('.banner-content')!.getBoundingClientRect();
    const banner = el.getBoundingClientRect();
    const arrow = el.querySelector('.banner-arrow')!.getBoundingClientRect();
    return { top: content.top - banner.top, bottom: banner.bottom - content.bottom, gap: arrow.top - content.bottom };
  }, width);
  expect(bounds.top).toBeGreaterThanOrEqual(0);
  expect(bounds.bottom).toBeGreaterThan(0);
  if (width <= 720) expect(bounds.gap).toBeGreaterThanOrEqual(0);
});
