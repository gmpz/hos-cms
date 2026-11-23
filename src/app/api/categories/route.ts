import { randomUUID } from "node:crypto";
import { CategoryScope, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { currentUser } from "@/server/auth/session";
import { prisma } from "@/server/database/prisma";

function categoryScope(value: unknown): CategoryScope | null {
  if (value === "posts") return CategoryScope.POSTS;
  if (value === "documents") return CategoryScope.DOCUMENTS;
  return null;
}

class CategoryRequestError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

function categoryName(value: unknown): string {
  if (typeof value !== "string") throw new CategoryRequestError("กรุณากรอกชื่อหมวดหมู่");
  const name = value.trim();
  if (!name || name.length > 160) throw new CategoryRequestError("ชื่อหมวดหมู่ต้องมี 1–160 ตัวอักษร");
  return name;
}

function categoryId(value: unknown): string {
  if (typeof value !== "string" || !value || value.length > 36) throw new CategoryRequestError("รหัสหมวดหมู่ไม่ถูกต้อง");
  return value;
}

async function listCategories(scope: CategoryScope) {
  return prisma.category.findMany({
    where: { scope },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, name: true, sortOrder: true, active: true },
  });
}

export async function GET(request: Request) {
  const scope = categoryScope(new URL(request.url).searchParams.get("scope"));
  if (!scope) return NextResponse.json({ error: "ประเภทหมวดหมู่ไม่ถูกต้อง" }, { status: 400 });
  return NextResponse.json(await listCategories(scope), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (user?.role !== "ADMIN" || user.mustChangePassword) return NextResponse.json({ error: "ไม่มีสิทธิ์จัดการหมวดหมู่" }, { status: 401 });
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new CategoryRequestError("ข้อมูลไม่ถูกต้อง");
    const data = body as Record<string, unknown>;
    const scope = categoryScope(data.scope);
    if (!scope) throw new CategoryRequestError("ประเภทหมวดหมู่ไม่ถูกต้อง");
    const action = data.action;
    await prisma.$transaction(async (tx) => {
      let id = "";
      let summary = "";
      if (action === "create") {
        const name = categoryName(data.name);
        const last = await tx.category.findFirst({ where: { scope }, orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
        id = randomUUID();
        await tx.category.create({ data: { id, scope, name, sortOrder: (last?.sortOrder ?? -1) + 1 } });
        summary = `เพิ่มหมวดหมู่ ${name}`;
      } else if (action === "rename") {
        id = categoryId(data.id);
        const name = categoryName(data.name);
        const existing = await tx.category.findFirst({ where: { id, scope } });
        if (!existing) throw new CategoryRequestError("ไม่พบหมวดหมู่", 404);
        await tx.category.update({ where: { id }, data: { name } });
        summary = `เปลี่ยนชื่อหมวดหมู่เป็น ${name}`;
      } else if (action === "setActive") {
        id = categoryId(data.id);
        if (typeof data.active !== "boolean") throw new CategoryRequestError("สถานะไม่ถูกต้อง");
        const existing = await tx.category.findFirst({ where: { id, scope } });
        if (!existing) throw new CategoryRequestError("ไม่พบหมวดหมู่", 404);
        if (!data.active) {
          const usage = scope === CategoryScope.POSTS
            ? await tx.post.count({ where: { categoryId: id, deletedAt: null } })
            : await tx.document.count({ where: { categoryId: id, deletedAt: null } });
          if (usage > 0) throw new CategoryRequestError("หมวดหมู่นี้ยังมีเนื้อหาใช้งานอยู่ กรุณาย้ายเนื้อหาก่อน", 409);
        }
        await tx.category.update({ where: { id }, data: { active: data.active } });
        summary = `${data.active ? "เปิด" : "ปิด"}ใช้งานหมวดหมู่ ${existing.name}`;
      } else if (action === "reorder") {
        if (!Array.isArray(data.ids) || !data.ids.every((value): value is string => typeof value === "string")) throw new CategoryRequestError("ลำดับหมวดหมู่ไม่ถูกต้อง");
        const ids = data.ids;
        const current = await tx.category.findMany({ where: { scope }, select: { id: true } });
        if (ids.length !== current.length || new Set(ids).size !== ids.length || current.some((item) => !ids.includes(item.id))) throw new CategoryRequestError("รายการหมวดหมู่เปลี่ยนไป กรุณาโหลดหน้าใหม่", 409);
        for (const [sortOrder, categoryId] of ids.entries()) await tx.category.update({ where: { id: categoryId }, data: { sortOrder } });
        id = ids[0] ?? "categories";
        summary = `เรียงลำดับหมวดหมู่ ${scope}`;
      } else if (action === "delete") {
        id = categoryId(data.id);
        const existing = await tx.category.findFirst({ where: { id, scope } });
        if (!existing) throw new CategoryRequestError("ไม่พบหมวดหมู่", 404);
        await tx.category.delete({ where: { id } });
        summary = `ลบหมวดหมู่ ${existing.name}`;
      } else {
        throw new CategoryRequestError("คำสั่งไม่ถูกต้อง");
      }
      await tx.auditLog.create({ data: { id: randomUUID(), actorId: user.id, action: `category.${action}`, entityType: "category", entityId: id, summary } });
    });
    return NextResponse.json(await listCategories(scope), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof CategoryRequestError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return NextResponse.json({ error: "มีหมวดหมู่นี้แล้ว" }, { status: 409 });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") return NextResponse.json({ error: "หมวดหมู่นี้ยังมีเนื้อหาใช้งานอยู่ กรุณาย้ายเนื้อหาก่อน" }, { status: 409 });
    return NextResponse.json({ error: "บันทึกหมวดหมู่ไม่สำเร็จ" }, { status: 500 });
  }
}
