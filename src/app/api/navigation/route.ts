import { currentUser } from "@/server/auth/session";
import { getNavigation, NavigationError, publicNavigation, saveNavigation } from "@/server/navigation/repository";

export async function GET(request: Request) {
  const admin = new URL(request.url).searchParams.get("admin") === "1";
  const user = await currentUser();
  if (admin && (user?.role !== "ADMIN" || user.mustChangePassword)) return Response.json({ error: "ไม่มีสิทธิ์ดูเมนูนำทาง" }, { status: 401 });
  try {
    const { navigation, revision } = await getNavigation();
    const authenticated = !!user && !user.mustChangePassword;
    return Response.json(admin ? { navigation, revision } : { navigation: publicNavigation(navigation, authenticated), authenticated }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ error: "โหลดเมนูนำทางไม่สำเร็จ" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const user = await currentUser();
  if (user?.role !== "ADMIN" || user.mustChangePassword) return Response.json({ error: "ไม่มีสิทธิ์จัดการเมนูนำทาง" }, { status: 401 });
  try {
    const body: unknown = await request.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) throw new NavigationError("ข้อมูลเมนูนำทางไม่ถูกต้อง");
    const value = body as Record<string, unknown>;
    return Response.json(await saveNavigation(value.navigation, value.revision, user.id), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof NavigationError) return Response.json({ error: error.message }, { status: error.status });
    return Response.json({ error: "บันทึกเมนูนำทางไม่สำเร็จ" }, { status: 500 });
  }
}
