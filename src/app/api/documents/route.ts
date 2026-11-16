import { NextResponse } from "next/server";
import { currentUser } from "@/server/auth/session";
import { DocumentInputError, listDeletedDocuments, listDocuments, saveDocument, withResolvedDocumentMedia } from "@/server/documents/repository";

export async function GET(request: Request) {
  const admin = new URL(request.url).searchParams.get("admin") === "1";
  const trash = new URL(request.url).searchParams.get("trash") === "1";
  if (admin || trash) {
    const user = await currentUser();
    if (user?.role !== "ADMIN" || user.mustChangePassword)
      return NextResponse.json({ error: "ไม่มีสิทธิ์ดูเอกสารฉบับร่าง" }, { status: 401 });
  }
  return NextResponse.json(trash ? await listDeletedDocuments() : await listDocuments(admin), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (user?.role !== "ADMIN" || user.mustChangePassword)
    return NextResponse.json({ error: "ไม่มีสิทธิ์จัดการเอกสาร" }, { status: 401 });
  try {
    return NextResponse.json(await withResolvedDocumentMedia(await saveDocument(await request.json())));
  } catch (error) {
    if (error instanceof DocumentInputError)
      return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "บันทึกเอกสารไม่สำเร็จ" }, { status: 500 });
  }
}
