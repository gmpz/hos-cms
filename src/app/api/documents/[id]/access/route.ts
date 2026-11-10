import { DocumentStatus, MediaKind } from "@prisma/client";
import { prisma } from "@/server/database/prisma";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response(null, { status: 404 });

  const body: unknown = await request.json().catch(() => null);
  const action = typeof body === "object" && body !== null && "action" in body ? body.action : null;
  if (action !== "open" && action !== "download") return Response.json({ error: "ประเภทการเข้าถึงไฟล์ไม่ถูกต้อง" }, { status: 400 });

  const document = await prisma.document.findFirst({
    where: { id, status: DocumentStatus.PUBLISHED, deletedAt: null },
    select: { mediaId: true },
  });
  if (!document?.mediaId) return new Response(null, { status: 404 });
  const media = await prisma.mediaAsset.findUnique({ where: { id: document.mediaId }, select: { kind: true, mimeType: true } });
  if (media?.kind !== MediaKind.DOCUMENT || action === "open" && media.mimeType !== "application/pdf")
    return new Response(null, { status: 404 });

  await prisma.document.update({
    where: { id },
    data: action === "open" ? { openCount: { increment: 1 } } : { downloadCount: { increment: 1 } },
  });
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
