import { expect, test } from '@playwright/test';
for (const width of [350, 680, 1000]) for (const height of ['slim','compact','standard','tall']) test(`text banner fills ${height} at ${width}px`, async ({page}) => {
  await page.goto('/news', {waitUntil:'domcontentloaded'});
  const geometry = await page.evaluate(({width,height}) => {
    const el=document.createElement('div');
    el.className=`banner-slider banner-presentation-content banner-height-${height}`;
    el.style.width=`${width}px`;
    el.innerHTML='<div class="banner-slider-track"><div class="banner-slide has-media content-position-center"><div class="banner-content"><h1>Hospital services</h1><p>Information for patients and visitors</p></div></div></div><button class="banner-arrow previous">←</button><div class="banner-dots"><button class="active"></button></div>';
    document.body.prepend(el);
    const banner=el.getBoundingClientRect();
    const slide=el.querySelector('.banner-slide')!.getBoundingClientRect();
    return {gap:banner.bottom-slide.bottom,top:slide.top-banner.top};
  }, {width,height});
  expect(Math.abs(geometry.gap)).toBeLessThanOrEqual(1);
  expect(Math.abs(geometry.top)).toBeLessThanOrEqual(1);
});
