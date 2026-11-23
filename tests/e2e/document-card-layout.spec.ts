import { expect, test } from '@playwright/test';
for (const width of [320, 390, 680]) test(`document metadata fits at ${width}px`, async ({ page }) => {
  await page.setViewportSize({width, height:900});
  await page.goto('/news', {waitUntil:'domcontentloaded'});
  const result = await page.evaluate(() => {
    const host = document.createElement('div');
    host.className='public-shell';
    host.innerHTML='<div class="unit-document-list document-block-list"><div class="unit-document-row-with-download"><a class="unit-document-open"><span class="document-file-icon type-pdf"><svg width="20" height="20"></svg><small>PDF</small></span><span><strong>Document title</strong><small class="document-block-card-meta"><span><svg width="12" height="12"></svg>21 Nov 2026</span><span><svg width="12" height="12"></svg>0 downloads</span><span class="document-new-badge">New</span></small></span></a><a class="public-document-action public-document-download">↓</a></div></div>';
    document.body.prepend(host);
    const icon=host.querySelector('.document-file-icon')!;
    const spans=[...host.querySelectorAll('.document-block-card-meta>span')];
    const rects=spans.map(e=>e.getBoundingClientRect());
    const button=host.querySelector('.public-document-download')!.getBoundingClientRect();
    const row=host.querySelector('.unit-document-row-with-download')!.getBoundingClientRect();
    return {buttonWidth:button.width,buttonHeight:button.height,rightGap:row.right-button.right,iconWidth:icon.getBoundingClientRect().width, iconHeight:icon.getBoundingClientRect().height, font:getComputedStyle(icon.querySelector('small')!).fontSize, overlap:rects.some((a,i)=>rects.slice(i+1).some(b=>a.left<b.right && a.right>b.left && a.top<b.bottom && a.bottom>b.top))};
  });
  expect(result.buttonWidth).toBe(40);
  expect(result.buttonHeight).toBe(40);
  expect(result.rightGap).toBeGreaterThanOrEqual(10);
  expect(result.rightGap).toBeLessThanOrEqual(12);
  expect(result.iconWidth).toBe(result.iconHeight);
  expect(result.font).toBe('7px');
  expect(result.overlap).toBe(false);
});
