import { currentUser } from "@/server/auth/session";
import { listAccessOptions } from "@/server/access/repository";

export async function GET() {
  const user = await currentUser();
  if (user?.role !== "ADMIN" || user.mustChangePassword) return Response.json({ error: "ไม่มีสิทธิ์ดูตัวเลือกสิทธิ์" }, { status: 401 });
  return Response.json(await listAccessOptions(), { headers: { "Cache-Control": "private, no-store" } });
}
