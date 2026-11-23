import { currentUser } from "@/server/auth/session";
import { makeImportTemplate } from "@/server/auth/user-import";

export async function GET() {
  const user = await currentUser();
  if (user?.role !== "ADMIN" || user.mustChangePassword) return Response.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
  const bytes = await makeImportTemplate();
  return new Response(Buffer.from(bytes), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": "attachment; filename=users-import-template.xlsx", "Cache-Control": "private, no-store" } });
}
