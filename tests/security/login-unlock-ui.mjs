// Local smoke test; creates and removes its own administrator and session.
import { chromium, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
if (!['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname)) throw new Error('Local DB only');
const db=new PrismaClient();
const id=randomUUID();
const token=randomBytes(32).toString('base64url');
let browser;
try {
  await db.user.create({data:{id,username:`ui-lock-${id}`,displayName:'Temporary unlock UI test',passwordHash:'not-a-login-password',role:'ADMIN',mustChangePassword:false,lockedUntil:new Date(Date.now()+900000)}});
  await db.session.create({data:{id:randomUUID(),userId:id,tokenHash:createHash('sha256').update(token).digest('hex'),expiresAt:new Date(Date.now()+600000)}});
  browser=await chromium.launch({headless:true,channel:"chrome"});
  const context=await browser.newContext();
  await context.addCookies([{name:'hos_cms_session',value:token,url:'http://localhost:3000',httpOnly:true,sameSite:'Lax'}]);
  const page=await context.newPage();
  await page.goto('http://localhost:3000/admin/users');
  await page.locator('input[type=search]:enabled').fill(`ui-lock-${id}`);
  await expect(page.getByText('ล็อกชั่วคราว',{exact:true})).toBeVisible();
  const more=page.getByRole('button',{name:'ตัวเลือกเพิ่มเติมสำหรับ Temporary unlock UI test'});
  await more.click(); await page.getByRole('menuitem',{name:'ปลดล็อกการเข้าสู่ระบบ'}).click();
  const dialog=page.getByRole('alertdialog').or(page.getByRole('dialog')).filter({hasText:'ปลดล็อกการเข้าสู่ระบบ?'});
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button',{name:'ยกเลิก',exact:true}).click();
  if (!(await db.user.findUniqueOrThrow({where:{id}})).lockedUntil) throw new Error('Cancel changed lock');
  await more.click(); await page.getByRole('menuitem',{name:'ปลดล็อกการเข้าสู่ระบบ'}).click();
  const responsePromise=page.waitForResponse(r=>r.request().method()==='POST');
  await dialog.getByRole('button',{name:'ปลดล็อก',exact:true}).click();
  const response=await responsePromise;
  if (!response.ok()) throw new Error(`Unlock request failed: ${response.status()}`);
  await expect(page.getByText('ปลดล็อกการเข้าสู่ระบบแล้ว',{exact:true})).toBeVisible();
  await expect(page.getByText('ล็อกชั่วคราว',{exact:true})).toHaveCount(0);
  if ((await db.user.findUniqueOrThrow({where:{id}})).lockedUntil) throw new Error('Unlock did not persist');
  await more.click(); await expect(page.getByRole('menuitem',{name:'ปลดล็อกการเข้าสู่ระบบ'})).toHaveCount(0);
  console.log('PASS: locked badge, menu, cancel, confirm, persisted unlock and refreshed status');
} finally {
  await browser?.close();
  await db.auditLog.deleteMany({where:{actorId:id}});
  await db.session.deleteMany({where:{userId:id}});
  await db.user.deleteMany({where:{id}});
  await db.$disconnect();
}
