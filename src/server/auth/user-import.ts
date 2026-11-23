import "server-only";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import ExcelJS from "exceljs";
import { prisma } from "@/server/database/prisma";
import { hashPassword } from "@/server/auth/password";
import { isValidPassword } from "@/features/auth/password-policy.mjs";

export const importHeaders = ["คำนำหน้าชื่อไทย", "ชื่อไทย", "นามสกุลไทย", "ชื่ออังกฤษ", "นามสกุลอังกฤษ", "ประเภทบุคลากร", "ตำแหน่ง", "ระดับ", "หน่วยงาน/กลุ่มงาน", "รหัสตั้งต้น"];
type ImportRow = { row: number; thaiPrefix: string; thaiFirst: string; thaiLast: string; englishFirst: string; englishLast: string; personType: string; position: string; level: string; unit: string; password: string };
type PreparedRow = ImportRow & { displayName: string; username: string; personTypeId: string | null; positionId: string | null; levelId: string | null; unitId: string | null };
export type ImportIssue = { row: number; message: string };
export type ImportPreview = { rows: { row: number; displayName: string; username: string }[]; errors: ImportIssue[] };

const normalize = (value: string) => value.trim().replace(/\s+/g, " ").toLocaleLowerCase("th");
const english = (value: string) => value.trim().toLowerCase();

export async function makeImportTemplate() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("นำเข้าบุคลากร");
  sheet.addRow(importHeaders);
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF14566A" } };
  sheet.columns = importHeaders.map((_, index) => ({ width: index === 8 ? 28 : 22 }));
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  const [masters, units] = await Promise.all([
    prisma.profileMaster.findMany({ where: { active: true }, select: { kind: true, name: true }, orderBy: [{ kind: "asc" }, { sortOrder: "asc" }] }),
    prisma.unit.findMany({ where: { deletedAt: null, id: { not: "hospital" } }, select: { name: true }, orderBy: { name: "asc" } }),
  ]);
  const reference = workbook.addWorksheet("ตัวเลือกจากระบบ");
  reference.addRow(["ประเภทบุคลากร", "ตำแหน่ง", "ระดับ", "หน่วยงาน/กลุ่มงาน"]);
  reference.getRow(1).font = { bold: true };
  reference.columns = Array.from({ length: 4 }, () => ({ width: 32 }));
  const lists = [masters.filter((item) => item.kind === "PERSON_TYPE").map((item) => item.name), masters.filter((item) => item.kind === "POSITION").map((item) => item.name), masters.filter((item) => item.kind === "LEVEL").map((item) => item.name), units.map((item) => item.name)];
  for (let index = 0; index < Math.max(...lists.map((list) => list.length)); index++) reference.addRow(lists.map((list) => list[index] ?? ""));
  const bytes = await workbook.xlsx.writeBuffer();
  return new Uint8Array(bytes);
}

export async function parseImportFile(file: File): Promise<ImportRow[]> {
  if (!/\.xlsx$/i.test(file.name) || file.size > 2 * 1024 * 1024 || file.size === 0) throw new Error("รองรับไฟล์ .xlsx ขนาดไม่เกิน 2 MB");
  const workbook = new ExcelJS.Workbook();
  try { await workbook.xlsx.load(Buffer.from(await file.arrayBuffer()) as unknown as Parameters<typeof workbook.xlsx.load>[0]); }
  catch { throw new Error("อ่านไฟล์ Excel ไม่สำเร็จ กรุณาใช้แบบฟอร์มที่ดาวน์โหลดจากระบบ"); }
  const sheet = workbook.worksheets[0];
  if (!sheet || importHeaders.some((header, index) => String(sheet.getRow(1).getCell(index + 1).value ?? "").trim() !== header)) throw new Error("หัวคอลัมน์ไม่ตรงกับแบบฟอร์มของระบบ");
  if (sheet.rowCount > 501) throw new Error("นำเข้าได้ครั้งละไม่เกิน 500 รายการ");
  const rows: ImportRow[] = [];
  for (let number = 2; number <= sheet.rowCount; number++) {
    const cells = importHeaders.map((_, index) => sheet.getRow(number).getCell(index + 1).text.trim());
    if (cells.every((value) => !value)) continue;
    const [thaiPrefix, thaiFirst, thaiLast, englishFirst, englishLast, personType, position, level, unit, password] = cells;
    rows.push({ row: number, thaiPrefix, thaiFirst, thaiLast, englishFirst, englishLast, personType, position, level, unit, password });
  }
  if (!rows.length) throw new Error("ไม่พบข้อมูลบุคลากรในไฟล์");
  return rows;
}

async function prepare(rows: ImportRow[], tx: Prisma.TransactionClient): Promise<{ prepared: PreparedRow[]; preview: ImportPreview }> {
  const [users, masters, units] = await Promise.all([
    tx.user.findMany({ select: { username: true, displayName: true } }),
    tx.profileMaster.findMany({ where: { active: true }, select: { id: true, kind: true, name: true } }),
    tx.unit.findMany({ where: { deletedAt: null, id: { not: "hospital" } }, select: { id: true, name: true } }),
  ]);
  const existingNames = users.map((user) => normalize(user.displayName));
  const fileNames = new Map<string, number>();
  const usernames = new Set(users.map((user) => user.username.toLowerCase()));
  const errors: ImportIssue[] = [];
  const prepared: PreparedRow[] = [];
  const lookup = (row: ImportRow, value: string, label: string, options: { id: string; name: string }[]) => {
    if (!value) return null;
    const matches = options.filter((option) => normalize(option.name) === normalize(value));
    if (matches.length !== 1) errors.push({ row: row.row, message: `ไม่พบ${label} “${value}” ในระบบ หรือชื่อนี้ไม่ชัดเจน` });
    return matches.length === 1 ? matches[0].id : null;
  };
  for (const row of rows) {
    const bareName = `${row.thaiFirst} ${row.thaiLast}`.trim();
    const displayName = `${row.thaiPrefix}${row.thaiFirst} ${row.thaiLast}`.trim();
    if (!row.thaiFirst || !row.thaiLast || displayName.length > 160) errors.push({ row: row.row, message: "กรุณากรอกชื่อและนามสกุลไทย (ชื่อที่แสดงรวมคำนำหน้าต้องไม่เกิน 160 ตัวอักษร)" });
    if (row.thaiFirst && row.thaiLast) {
      const key = normalize(bareName);
      const duplicateRow = fileNames.get(key);
      if (duplicateRow) errors.push({ row: row.row, message: `ชื่อ–นามสกุลไทย “${bareName}” ซ้ำกับแถว ${duplicateRow} ในไฟล์` });
      else if (existingNames.some((name) => name.endsWith(key))) errors.push({ row: row.row, message: `ชื่อ–นามสกุลไทย “${bareName}” มีบัญชีอยู่แล้วในระบบ` });
      fileNames.set(key, duplicateRow ?? row.row);
    }
    if (!/^[A-Za-z][A-Za-z-]*$/.test(row.englishFirst) || !/^[A-Za-z][A-Za-z-]*$/.test(row.englishLast)) errors.push({ row: row.row, message: "ชื่อและนามสกุลอังกฤษต้องเป็นอักษร A–Z (ใช้ขีดกลางได้)" });
    if (!isValidPassword(row.password)) errors.push({ row: row.row, message: "รหัสตั้งต้นไม่ผ่านเงื่อนไข: อย่างน้อย 10 ตัว มีตัวใหญ่ ตัวเล็ก ตัวเลข และสัญลักษณ์" });
    if (row.password.length > 200) errors.push({ row: row.row, message: "รหัสตั้งต้นยาวเกิน 200 ตัวอักษร" });
    const personTypeId = lookup(row, row.personType, "ประเภทบุคลากร", masters.filter((item) => item.kind === "PERSON_TYPE"));
    const positionId = lookup(row, row.position, "ตำแหน่ง", masters.filter((item) => item.kind === "POSITION"));
    const levelId = lookup(row, row.level, "ระดับ", masters.filter((item) => item.kind === "LEVEL"));
    const unitId = lookup(row, row.unit, "หน่วยงาน/กลุ่มงาน", units);
    let username = "";
    if (/^[A-Za-z][A-Za-z-]*$/.test(row.englishFirst) && /^[A-Za-z][A-Za-z-]*$/.test(row.englishLast)) {
      const first = english(row.englishFirst);
      const last = english(row.englishLast);
      for (let length = 2; length <= last.length; length++) {
        const candidate = `${first}.${last.slice(0, length)}`;
        if (candidate.length <= 80 && !usernames.has(candidate)) { username = candidate; break; }
      }
      if (!username) errors.push({ row: row.row, message: "ไม่สามารถสร้างชื่อผู้ใช้ที่ไม่ซ้ำได้ กรุณาตรวจชื่ออังกฤษ" });
      else usernames.add(username);
    }
    prepared.push({ ...row, displayName, username, personTypeId, positionId, levelId, unitId });
  }
  return { prepared, preview: { rows: prepared.map(({ row, displayName, username }) => ({ row, displayName, username })), errors } };
}

export async function previewImport(rows: ImportRow[]) {
  return prisma.$transaction(async (tx) => (await prepare(rows, tx)).preview);
}

export async function commitImport(rows: ImportRow[], actorId: string) {
  return prisma.$transaction(async (tx) => {
    const { prepared, preview } = await prepare(rows, tx);
    if (preview.errors.length) return { ...preview, created: 0 };
    for (const row of prepared) {
      const id = randomUUID();
      await tx.user.create({ data: { id, username: row.username, displayName: row.displayName, passwordHash: await hashPassword(row.password), role: "MEMBER", mustChangePassword: true, personTypeId: row.personTypeId, positionId: row.positionId, levelId: row.levelId, memberships: row.unitId ? { create: { unitId: row.unitId, isPrimary: true } } : undefined } });
      await tx.auditLog.create({ data: { id: randomUUID(), actorId, action: "user.import", entityType: "user", entityId: id, summary: `นำเข้าบัญชี ${row.username}` } });
    }
    return { ...preview, created: prepared.length };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 120000 });
}
