import { Prisma } from "@prisma/client";
import { currentUser } from "@/server/auth/session";
import { actOnCmsPage, CmsPageError, discardCmsPageDraft, getCmsPageById, getCmsPageGrants, saveCmsPageDocument, toPageDocument, toSummary, updateCmsPageMetadata } from "@/server/pages/repository";
import { AccessInputError } from "@/server/access/repository";
import { resolveMediaReferences, stripResolvedMedia } from "@/server/media/resolve-references";

type Context = { params: Promise<{ id: string }> };

async function adminUser() {
  const user = await currentUser();
  return user?.role === "ADMIN" && !user.mustChangePassword ? user : null;
}

export async function GET(_request: Request, { params }: Context) {
  if (!await adminUser()) return Response.json({ error: "ไม่มีสิทธิ์ดูหน้าเว็บไซต์" }, { status: 401 });
  const { id } = await params;
  const row = await getCmsPageById(id);
  if (!row) return Response.json({ error: "ไม่พบหน้าเว็บไซต์" }, { status: 404 });
  const documents = await resolveMediaReferences({ page: toPageDocument(row), publishedPage: toPageDocument(row, true) });
  return Response.json({ summary: toSummary(row), ...documents, accessLevel: row.accessLevel, accessGrants: await getCmsPageGrants(id), revision: row.revision }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request, { params }: Context) {
  const user = await adminUser();
  if (!user) return Response.json({ error: "ไม่มีสิทธิ์จัดการหน้าเว็บไซต์" }, { status: 401 });
  try {
    const { id } = await params;
    const body: unknown = await request.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) throw new CmsPageError("คำสั่งไม่ถูกต้อง");
    const value = body as Record<string, unknown>;
    if (value.action === "save") {
      const row = await saveCmsPageDocument(id, stripResolvedMedia(value.page), value.publish === true, value.accessLevel, value.accessGrants, value.revision, user.id);
      const documents = await resolveMediaReferences({ page: toPageDocument(row), publishedPage: toPageDocument(row, true) });
      return Response.json({ summary: toSummary(row), ...documents, accessLevel: row.accessLevel, accessGrants: await getCmsPageGrants(id), revision: row.revision });
    }
    if (value.action === "discardDraft") {
      const row = await discardCmsPageDraft(id, value.revision, user.id);
      const documents = await resolveMediaReferences({ page: toPageDocument(row), publishedPage: toPageDocument(row, true) });
      return Response.json({ summary: toSummary(row), ...documents, accessLevel: row.accessLevel, accessGrants: await getCmsPageGrants(id), revision: row.revision });
    }
    if (value.action === "metadata") return Response.json({ summary: await updateCmsPageMetadata(id, value.name, value.path, value.revision, user.id) });
    if (value.action === "duplicate" || value.action === "unpublish" || value.action === "delete" || value.action === "restore" || value.action === "purge")
      return Response.json({ summary: await actOnCmsPage(id, value.action, value.revision, user.id) });
    throw new CmsPageError("คำสั่งไม่ถูกต้อง");
  } catch (error) {
    if (error instanceof CmsPageError) return Response.json({ error: error.message }, { status: error.status });
    if (error instanceof AccessInputError) return Response.json({ error: error.message }, { status: 400 });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return Response.json({ error: "URL นี้ถูกใช้แล้ว" }, { status: 409 });
    return Response.json({ error: "จัดการหน้าไม่สำเร็จ" }, { status: 500 });
  }
}
