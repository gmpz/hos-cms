const fs = require('fs');
const path = require('path');
const { chromium } = require('/Users/x86/Documents/dev/hos-cms/.agents/skills/visual-check/scripts/node_modules/playwright-core');
const root = '/Users/x86/Documents/dev/hos-cms/docs/manuals/hos-cms';
const chapter = process.argv[2];
if (!/^\d{2}$/.test(chapter || '')) throw new Error('chapter 01-16 required');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'capture-plan.json'), 'utf8'));
const selected = new Set(process.argv.slice(3));
const items = (manifest[chapter] || []).filter(item => !selected.size || selected.has(item.name));
if (!items) throw new Error('missing chapter plan');
const outDir = path.join(root, 'screenshots', chapter);
fs.mkdirSync(outDir, { recursive: true });
(async () => {
  const context = await chromium.launchPersistentContext('/private/tmp/hos-cms-manual-browser-profile', {
    headless: true, channel: 'chromium', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: 'th-TH',
  });
  const page = context.pages()[0] || await context.newPage();
  const admin = await page.goto('http://localhost:3000/admin', {waitUntil:'domcontentloaded',timeout:30000});
  if (admin.status() !== 200 || !page.url().endsWith('/admin')) throw new Error('Authenticated admin session expired; ask user to log in again');
  for (const item of items) {
    const response = await page.goto('http://localhost:3000' + item.route, {waitUntil:'domcontentloaded', timeout:30000});
    await page.waitForTimeout(item.wait || 1100);
    if (item.route.startsWith('/admin') && !page.url().startsWith('http://localhost:3000/admin')) throw new Error('Admin session expired');
    if (item.click) {
      const target = page.locator(item.click).first();
      if (await target.count()) await target.click({timeout:5000});
      await page.waitForTimeout(450);
    }
    if (item.scroll) await page.locator(item.scroll).first().evaluate(el => {el.scrollTop = el.scrollHeight});
    if (!item.route.startsWith('/admin')) await page.evaluate(() => document.querySelectorAll('dialog.announcement-dialog').forEach(dialog => dialog.close()));
    await page.locator('nextjs-portal').evaluateAll(nodes => nodes.forEach(node => node.remove())).catch(() => {});
    await page.addStyleTag({content: 'nextjs-portal,.nextjs-toast{visibility:hidden!important}'});
    const masks = ['input[type=password]', 'input[autocomplete="one-time-code"]', 'input[name*=token i]', 'input[name*=secret i]', 'input[name*=otp i]'];
    if (item.route.includes('/security/otp')) masks.push('main code', 'main img[src^="data:"]');
    const mask = masks.map(x => page.locator(x));
    let marker = null;
    if (item.mark) {
      const box = await page.locator(item.mark).first().boundingBox().catch(() => null);
      if (box) marker = await page.evaluate(({x,y,n}) => {const d=document.createElement('div'); d.id='manual-step-marker'; d.textContent=String(n); Object.assign(d.style,{position:'fixed',left:Math.max(4,x-13)+'px',top:Math.max(4,y-13)+'px',width:'28px',height:'28px',borderRadius:'50%',background:'#c62828',color:'#fff',font:'bold 17px Arial',textAlign:'center',lineHeight:'28px',boxShadow:'0 0 0 3px white',zIndex:'2147483647',pointerEvents:'none'});document.body.appendChild(d);return true}, {x:box.x,y:box.y,n:item.number||1});
    }
    const file = path.join(outDir, item.name + '.png');
    await page.screenshot({path:file,fullPage:false,mask,maskColor:'#e8ecec',animations:'disabled'});
    if (marker) await page.evaluate(() => document.getElementById('manual-step-marker')?.remove());
    console.log(JSON.stringify({chapter,name:item.name,status:response.status(),url:page.url(),file}));
  }
  await context.close();
})().catch(e=>{console.error(e.stack||e.message);process.exit(1)});
