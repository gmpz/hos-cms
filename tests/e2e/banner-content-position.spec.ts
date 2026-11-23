import { expect, test } from "@playwright/test";

const positions = [
  "top-left", "top-center", "top-right",
  "center-left", "center", "center-right",
  "bottom-left", "bottom-center", "bottom-right",
] as const;

for (const width of [350, 680, 1000]) {
  for (const position of positions) {
    test(`${position} stays positioned in a ${width}px banner`, async ({ page }) => {
      await page.goto("/news", { waitUntil: "domcontentloaded" });
      const geometry = await page.evaluate(({ width, position }) => {
        const banner = document.createElement("div");
        banner.className = "banner-slider banner-presentation-content banner-height-standard";
        banner.style.width = `${width}px`;
        banner.innerHTML = `<div class="banner-slider-track"><div class="banner-slide content-position-${position}"><div class="banner-content"><h1>Hospital services</h1><p>Information for patients</p></div></div></div>`;
        document.body.prepend(banner);
        const slide = banner.querySelector(".banner-slide")!;
        const content = banner.querySelector(".banner-content")!;
        const slideRect = slide.getBoundingClientRect();
        const contentRect = content.getBoundingClientRect();
        const style = getComputedStyle(slide);
        const area = {
          left: slideRect.left + parseFloat(style.paddingLeft),
          right: slideRect.right - parseFloat(style.paddingRight),
          top: slideRect.top + parseFloat(style.paddingTop),
          bottom: slideRect.bottom - parseFloat(style.paddingBottom),
        };
        const horizontal = position.endsWith("left") ? "left" : position.endsWith("right") ? "right" : "center";
        const vertical = position.startsWith("top") ? "top" : position.startsWith("bottom") ? "bottom" : "center";
        const actualX = horizontal === "left" ? contentRect.left - area.left : horizontal === "right" ? area.right - contentRect.right : (contentRect.left + contentRect.right - area.left - area.right) / 2;
        const actualY = vertical === "top" ? contentRect.top - area.top : vertical === "bottom" ? area.bottom - contentRect.bottom : (contentRect.top + contentRect.bottom - area.top - area.bottom) / 2;
        banner.remove();
        return { actualX, actualY, topPadding: parseFloat(style.paddingTop), bottomPadding: parseFloat(style.paddingBottom) };
      }, { width, position });
      expect(Math.abs(geometry.actualX)).toBeLessThanOrEqual(2);
      expect(Math.abs(geometry.actualY)).toBeLessThanOrEqual(2);
      if (width <= 720) expect(geometry.bottomPadding).toBe(geometry.topPadding);
    });
  }
}
