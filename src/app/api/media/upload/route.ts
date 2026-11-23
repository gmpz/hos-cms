import { InvalidUploadError, validatedUploadBytes } from "@/server/media/validate-upload";
import { randomUUID } from "node:crypto";
import { MediaKind, type Prisma } from "@prisma/client";
import { currentUser } from "@/server/auth/session";
import { prisma } from "@/server/database/prisma";
import { deleteMediaFile, mediaPublicUrl, writeMediaFile } from "@/server/media/storage";
import { findMediaUsages } from "@/server/media/usage";

const maxFileSize = 25 * 1024 * 1024;
const extensionByMimeType: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
  "application/pdf": "pdf", "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
};

async function canManageMedia() {
  const user = await currentUser();
  return user?.role === "ADMIN" && !user.mustChangePassword;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mediaDto(item: { id: string; name: string; kind: MediaKind; mimeType: string; sizeBytes: number; alt: string; fileName: string; uploadedAt: Date }) {
  return {
    id: item.id,
    name: item.name,
    kind: item.kind === MediaKind.IMAGE ? "image" : "document",
    mimeType: item.mimeType,
    size: item.sizeBytes,
    alt: item.alt,
    uploadedAt: item.uploadedAt.toISOString(),
    previewUrl: mediaPublicUrl(item.fileName),
  };
}

export async function GET(request: Request) {
  if (!await canManageMedia()) return Response.json({ message: "ไม่มีสิทธิ์ดูคลังสื่อ" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const params = new URL(request.url).searchParams;
  const ids = params.get("ids");
  if (ids !== null) {
    const selectedIds = [...new Set(ids.split(",").filter(Boolean))];
    if (selectedIds.length > 50 || selectedIds.some((id) => id.length > 191)) return Response.json({ message: "รายการไฟล์ไม่ถูกต้อง" }, { status: 400 });
    const items = await prisma.mediaAsset.findMany({ where: { id: { in: selectedIds } } });
    return Response.json({ items: items.map(mediaDto) }, { headers: { "Cache-Control": "no-store" } });
  }
  if (params.get("library") === "1") {
    const kind = params.get("kind") ?? "all";
    if (kind !== "all" && kind !== "image" && kind !== "document") return Response.json({ message: "ประเภทไฟล์ไม่ถูกต้อง" }, { status: 400 });
    const size = params.get("size") ?? "10";
    if (!["10", "20", "50"].includes(size)) return Response.json({ message: "จำนวนรายการต่อหน้าไม่ถูกต้อง" }, { status: 400 });
    const requestedPage = Number(params.get("page") ?? "1");
    if (!Number.isSafeInteger(requestedPage) || requestedPage < 1 || requestedPage > 100_000)
      return Response.json({ message: "หมายเลขหน้าไม่ถูกต้อง" }, { status: 400 });
    const search = (params.get("search") ?? "").trim().slice(0, 200);
    const where: Prisma.MediaAssetWhereInput = {
      ...(kind !== "all" ? { kind: kind === "image" ? MediaKind.IMAGE : MediaKind.DOCUMENT } : {}),
      ...(search ? { name: { contains: search } } : {}),
    };
    const limit = Number(size);
    const [items, total, groups] = await Promise.all([
      prisma.mediaAsset.findMany({ where, orderBy: [{ uploadedAt: "desc" }, { id: "desc" }], skip: (requestedPage - 1) * limit, take: limit }),
      prisma.mediaAsset.count({ where }),
      prisma.mediaAsset.groupBy({ by: ["kind"], _count: { _all: true }, _sum: { sizeBytes: true } }),
    ]);
    const summary = { image: { count: 0, bytes: 0 }, document: { count: 0, bytes: 0 } };
    for (const group of groups) {
      const key = group.kind === MediaKind.IMAGE ? "image" : "document";
      summary[key] = { count: group._count._all, bytes: group._sum.sizeBytes ?? 0 };
    }
    return Response.json({ items: items.map(mediaDto), total, page: requestedPage, summary }, { headers: { "Cache-Control": "no-store" } });
  }
  if (params.get("paged") === "1") {
    const kind = params.get("kind");
    if (kind !== "image" && kind !== "document" && kind !== "pdf") return Response.json({ message: "ประเภทไฟล์ไม่ถูกต้อง" }, { status: 400 });
    const requestedLimit = Number(params.get("limit") ?? 24);
    const limit = Number.isInteger(requestedLimit) ? Math.max(1, Math.min(requestedLimit, 50)) : 24;
    const cursor = params.get("cursor");
    if (cursor && cursor.length > 191) return Response.json({ message: "ตำแหน่งรายการไม่ถูกต้อง" }, { status: 400 });
    const search = (params.get("search") ?? "").trim().slice(0, 200);
    const items = await prisma.mediaAsset.findMany({
      where: {
        kind: kind === "image" ? MediaKind.IMAGE : MediaKind.DOCUMENT,
        ...(kind === "pdf" ? { OR: [{ mimeType: "application/pdf" }, { name: { endsWith: ".pdf" } }] } : {}),
        ...(search ? { name: { contains: search } } : {}),
      },
      orderBy: [{ uploadedAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasMore = items.length > limit;
    const page = items.slice(0, limit);
    return Response.json({ items: page.map(mediaDto), nextCursor: hasMore ? page.at(-1)?.id ?? null : null }, { headers: { "Cache-Control": "no-store" } });
  }
  return Response.json({ message: "กรุณาระบุรายการไฟล์หรือใช้การแบ่งหน้า" }, { status: 400 });
}

export async function POST(request: Request) {
  if (!await canManageMedia()) return Response.json({ message: "ไม่มีสิทธิ์อัปโหลดไฟล์" }, { status: 401 });
  let savedPath: string | null = null;
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) return Response.json({ message: "ไม่พบไฟล์ที่ต้องการอัปโหลด" }, { status: 400 });
    if (file.size > maxFileSize) return Response.json({ message: "ไฟล์ต้องมีขนาดไม่เกิน 25 MB" }, { status: 413 });
    const extension = extensionByMimeType[file.type];
    if (!extension) return Response.json({ message: "ไม่รองรับประเภทไฟล์นี้" }, { status: 415 });
    const bytes = await validatedUploadBytes(file);
    const fileName = `${randomUUID()}.${extension}`;
    const requestedId = formData.get("mediaId");
    const id = typeof requestedId === "string" && /^[\w:-]{1,191}$/.test(requestedId) ? requestedId : `upload:${fileName}`;
    if (await prisma.mediaAsset.findUnique({ where: { id }, select: { id: true } })) return Response.json({ message: "รหัสสื่อซ้ำ" }, { status: 409 });
    savedPath = fileName;
    await writeMediaFile(fileName, bytes);
    await prisma.mediaAsset.create({ data: {
      id,
      name: file.name.slice(0, 255),
      kind: file.type.startsWith("image/") ? MediaKind.IMAGE : MediaKind.DOCUMENT,
      mimeType: file.type,
      sizeBytes: file.size,
      alt: file.name.replace(/\.[^.]+$/, "").slice(0, 500),
      fileName,
    } });
    return Response.json({ id, url: mediaPublicUrl(fileName) }, { status: 201 });
  } catch (error) {
    if (savedPath) await deleteMediaFile(savedPath).catch(() => undefined);
    if (error instanceof InvalidUploadError) return Response.json({ message: error.message }, { status: 415 });
    return Response.json({ message: "อัปโหลดไฟล์ไม่สำเร็จ" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!await canManageMedia()) return Response.json({ message: "ไม่มีสิทธิ์แก้ไขไฟล์" }, { status: 401 });
  const value: unknown = await request.json().catch(() => null);
  if (!record(value) || typeof value.id !== "string" || !value.id) return Response.json({ message: "รหัสสื่อไม่ถูกต้อง" }, { status: 400 });
  const name = value.name;
  const alt = value.alt;
  if (typeof name !== "string" || !name.trim() || name.length > 255 || typeof alt !== "string" || alt.length > 500)
    return Response.json({ message: "ข้อมูลสื่อไม่ถูกต้อง" }, { status: 400 });
  const updated = await prisma.mediaAsset.updateMany({ where: { id: value.id }, data: { name: name.trim(), alt: alt.trim() } });
  if (!updated.count) return Response.json({ message: "ไม่พบไฟล์" }, { status: 404 });
  return Response.json({ success: true });
}

export async function DELETE(request: Request) {
  if (!await canManageMedia()) return Response.json({ message: "ไม่มีสิทธิ์ลบไฟล์" }, { status: 401 });
  const value: unknown = await request.json().catch(() => null);
  if (!record(value) || typeof value.id !== "string" || !value.id) return Response.json({ message: "รหัสสื่อไม่ถูกต้อง" }, { status: 400 });
  const item = await prisma.mediaAsset.findUnique({ where: { id: value.id } });
  if (!item) return Response.json({ message: "ไม่พบไฟล์" }, { status: 404 });
  const usages = await findMediaUsages(item.id);
  if (usages.length) return Response.json({ message: `ไฟล์นี้ยังถูกใช้งานอยู่ ${usages.length} ตำแหน่ง`, usages }, { status: 409 });
  await prisma.mediaAsset.delete({ where: { id: item.id } });
  await deleteMediaFile(item.fileName);
  return Response.json({ success: true });
}
