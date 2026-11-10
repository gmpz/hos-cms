import { Prisma } from "@prisma/client";
import { currentUser } from "@/server/auth/session";
import { CmsPageError, createCmsPage, listCmsPages, listDeletedCmsPages } from "@/server/pages/repository";

async function adminUser() {
  const user = await currentUser();
  return user?.role === "ADMIN" && !user.mustChangePassword ? user : null;
}

export async function GET(request: Request) {
  if (!await adminUser()) return Response.json({ error: "ไม่มีสิทธิ์ดูหน้าเว็บไซต์" }, { status: 401 });
  const trash = new URL(request.url).searchParams.get("trash") === "true";
  return Response.json(trash ? await listDeletedCmsPages() : await listCmsPages(), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const user = await adminUser();
  if (!user) return Response.json({ error: "ไม่มีสิทธิ์จัดการหน้าเว็บไซต์" }, { status: 401 });
  try {
    const body: unknown = await request.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) throw new CmsPageError("ข้อมูลหน้าไม่ถูกต้อง");
    const value = body as Record<string, unknown>;
    return Response.json(await createCmsPage(value.name, value.path, user.id));
  } catch (error) {
    if (error instanceof CmsPageError) return Response.json({ error: error.message }, { status: error.status });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return Response.json({ error: "URL นี้ถูกใช้แล้ว" }, { status: 409 });
    return Response.json({ error: "สร้างหน้าไม่สำเร็จ" }, { status: 500 });
  }
}
