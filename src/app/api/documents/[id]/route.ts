import { NextResponse } from "next/server";
import { currentUser } from "@/server/auth/session";
import { actOnDocument, DocumentInputError, withResolvedDocumentMedia } from "@/server/documents/repository";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (user?.role !== "ADMIN" || user.mustChangePassword)
    return NextResponse.json({ error: "ไม่มีสิทธิ์จัดการเอกสาร" }, { status: 401 });
  try {
    const body: unknown = await request.json();
    if (typeof body !== "object" || body === null || !("action" in body) ||
      !["unpublish", "delete", "restore", "purge"].includes(String(body.action)))
      throw new DocumentInputError("คำสั่งไม่ถูกต้อง");
    const { id } = await params;
    const document = await actOnDocument(id, body.action as "unpublish" | "delete" | "restore" | "purge");
    return NextResponse.json({ document: document ? await withResolvedDocumentMedia(document) : null });
  } catch (error) {
    if (error instanceof DocumentInputError)
      return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "จัดการเอกสารไม่สำเร็จ" }, { status: 500 });
  }
}
