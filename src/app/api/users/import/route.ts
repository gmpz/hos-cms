import { Prisma } from "@prisma/client";
import { currentUser } from "@/server/auth/session";
import { commitImport, parseImportFile, previewImport } from "@/server/auth/user-import";

export async function POST(request: Request) {
  const user = await currentUser();
  if (user?.role !== "ADMIN" || user.mustChangePassword) return Response.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return Response.json({ error: "กรุณาเลือกไฟล์ Excel" }, { status: 400 });
    const rows = await parseImportFile(file);
    if (form.get("mode") === "preview") return Response.json(await previewImport(rows));
    if (form.get("mode") === "commit") return Response.json(await commitImport(rows, user.id));
    return Response.json({ error: "คำสั่งไม่ถูกต้อง" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2002" || error.code === "P2034")
      ? "ข้อมูลบัญชีมีการเปลี่ยนแปลงระหว่างนำเข้า กรุณาตรวจสอบไฟล์ใหม่"
      : error instanceof Error && /^(รองรับไฟล์|อ่านไฟล์|หัวคอลัมน์|นำเข้าได้|ไม่พบข้อมูล)/.test(error.message) ? error.message : "นำเข้าไม่สำเร็จ กรุณาลองใหม่";
    return Response.json({ error: message }, { status: 400 });
  }
}
