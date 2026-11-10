import { prisma } from "@/server/database/prisma";
import { checkMediaStorage } from "@/server/media/storage";

export async function GET() {
  try {
    await Promise.all([prisma.$queryRaw`SELECT 1`, checkMediaStorage()]);
    return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
