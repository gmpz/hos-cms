import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { currentUser } from "@/server/auth/session";
import { listDeletedPosts, listPosts, PostInputError, savePost } from "@/server/posts/repository";

export async function GET(request: Request) {
  const admin = new URL(request.url).searchParams.get("admin") === "1";
  const trash = new URL(request.url).searchParams.get("trash") === "1";
  if (admin || trash) {
    const user = await currentUser();
    if (user?.role !== "ADMIN" || user.mustChangePassword)
      return NextResponse.json({ error: "ไม่มีสิทธิ์ดูข่าวฉบับร่าง" }, { status: 401 });
  }
  return NextResponse.json(trash ? await listDeletedPosts() : await listPosts(admin), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (user?.role !== "ADMIN" || user.mustChangePassword)
    return NextResponse.json({ error: "ไม่มีสิทธิ์จัดการข่าว" }, { status: 401 });
  try {
    const post = await savePost(await request.json());
    return NextResponse.json(post);
  } catch (error) {
    if (error instanceof PostInputError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      return NextResponse.json({ error: "URL ข่าวซ้ำ กรุณาลองใหม่" }, { status: 409 });
    return NextResponse.json({ error: "บันทึกข่าวไม่สำเร็จ" }, { status: 500 });
  }
}
