import { DocumentStatus, MediaKind } from "@prisma/client";
import { documentFileName } from "@/features/documents/document-file-name";
import { prisma } from "@/server/database/prisma";
import { readMediaFile } from "@/server/media/storage";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; fileName: string }> },
) {
  const { id, fileName: requestedFileName } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response(null, { status: 404 });

  const document = await prisma.document.findFirst({
    where: { id, status: DocumentStatus.PUBLISHED, deletedAt: null },
    select: { title: true, mediaId: true },
  });
  if (!document?.mediaId) return new Response(null, { status: 404 });

  const media = await prisma.mediaAsset.findUnique({
    where: { id: document.mediaId },
    select: { kind: true, mimeType: true, fileName: true },
  });
  if (!media || media.kind !== MediaKind.DOCUMENT) return new Response(null, { status: 404 });

  const fileName = documentFileName(document.title, media.mimeType);
  if (requestedFileName !== fileName) {
    const redirectUrl = new URL(`/api/documents/${id}/file/${encodeURIComponent(fileName)}`, request.url);
    redirectUrl.search = new URL(request.url).search;
    return new Response(null, {
      status: 307,
      headers: {
        Location: redirectUrl.toString(),
        "Cache-Control": "no-store",
      },
    });
  }

  let bytes: Uint8Array;
  try {
    bytes = await readMediaFile(media.fileName);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return new Response(null, { status: 404 });
    }
    throw error;
  }

  const fallbackName = `document.${fileName.split(".").pop()}`;
  const intent = new URL(request.url).searchParams.get("intent");
  const opensInline = media.mimeType === "application/pdf" && intent !== "download";
  const disposition = opensInline ? "inline" : "attachment";
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": media.mimeType,
      "Content-Disposition": `${disposition}; filename="${fallbackName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function HEAD() {
  return new Response(null, { status: 405, headers: { Allow: "GET", "Cache-Control": "no-store" } });
}
