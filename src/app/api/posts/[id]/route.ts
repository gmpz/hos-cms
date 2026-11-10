import { NextResponse } from "next/server";
import { currentUser } from "@/server/auth/session";
import { actOnPost, getPostById, PostInputError } from "@/server/posts/repository";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (user?.role !== "ADMIN" || user.mustChangePassword)
    return NextResponse.json({ error: "ไม่มีสิทธิ์ดูข่าว" }, { status: 401 });
  const post = await getPostById((await params).id);
  if (!post) return NextResponse.json({ error: "ไม่พบข่าว" }, { status: 404 });
  return NextResponse.json(post, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (user?.role !== "ADMIN" || user.mustChangePassword)
    return NextResponse.json({ error: "ไม่มีสิทธิ์จัดการข่าว" }, { status: 401 });
  try {
    const { id } = await params;
    const body: unknown = await request.json();
    if (typeof body !== "object" || body === null || !("action" in body) ||
      !["duplicate", "unpublish", "delete", "restore", "purge", "discardDraft"].includes(String(body.action)))
      throw new PostInputError("คำสั่งไม่ถูกต้อง");
    const action = body.action as "duplicate" | "unpublish" | "delete" | "restore" | "purge" | "discardDraft";
    const revision = "revision" in body && typeof body.revision === "number" ? body.revision : undefined;
    return NextResponse.json({ post: await actOnPost(id, action, user.id, revision) });
  } catch (error) {
    if (error instanceof PostInputError)
      return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "จัดการข่าวไม่สำเร็จ" }, { status: 500 });
  }
}
