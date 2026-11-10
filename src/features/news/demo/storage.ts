import type { DemoPost } from "@/features/pages/demo/data";

export const postsChangeEvent = "hos-posts-change";

let publicPosts: DemoPost[] = [];
let publicPostsLoaded = false;
let adminPosts: DemoPost[] = [];
let deletedPosts: DemoPost[] = [];

function isPost(value: unknown): value is DemoPost {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    "id" in value && typeof value.id === "string" &&
    "slug" in value && typeof value.slug === "string" &&
    "title" in value && typeof value.title === "string" &&
    "blocks" in value && Array.isArray(value.blocks);
}

export function readPosts(includeDrafts = false): DemoPost[] {
  return (includeDrafts ? adminPosts : publicPosts) ?? [];
}

export function seedPublicPosts(posts: DemoPost[]): void {
  if (!Array.isArray(posts)) return;
  publicPosts = posts;
  publicPostsLoaded = true;
}

export function publicPostsAreLoaded(): boolean { return publicPostsLoaded; }

export function readDeletedPosts(): DemoPost[] { return deletedPosts; }

export async function refreshDeletedPosts(): Promise<DemoPost[]> {
  const response = await fetch("/api/posts?trash=1", { cache: "no-store" });
  if (!response.ok) throw new Error("โหลดถังขยะไม่สำเร็จ");
  const payload: unknown = await response.json();
  if (!Array.isArray(payload) || !payload.every(isPost)) throw new Error("ข้อมูลถังขยะไม่ถูกต้อง");
  deletedPosts = payload;
  window.dispatchEvent(new Event(postsChangeEvent));
  return payload;
}

export async function refreshPosts(includeDrafts = false): Promise<DemoPost[]> {
  const response = await fetch(`/api/posts${includeDrafts ? "?admin=1" : ""}`, { cache: "no-store" });
  if (!response.ok) throw new Error("โหลดข่าวไม่สำเร็จ");
  const payload: unknown = await response.json();
  if (!Array.isArray(payload) || !payload.every(isPost)) throw new Error("ข้อมูลข่าวไม่ถูกต้อง");
  if (includeDrafts) adminPosts = payload;
  else { publicPosts = payload; publicPostsLoaded = true; }
  window.dispatchEvent(new Event(postsChangeEvent));
  return payload;
}

export async function savePost(post: DemoPost, publish = false): Promise<DemoPost> {
  const response = await fetch("/api/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...post, publish }),
  });
  const payload: unknown = await response.json();
  if (!response.ok) {
    const error = typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string"
      ? payload.error : "บันทึกข่าวไม่สำเร็จ";
    throw new Error(error);
  }
  if (!isPost(payload)) throw new Error("ข้อมูลข่าวที่บันทึกไม่ถูกต้อง");
  adminPosts = [payload, ...adminPosts.filter((item) => item.id !== payload.id)];
  if (publish) publicPosts = [payload, ...publicPosts.filter((item) => item.id !== payload.id)];
  window.dispatchEvent(new Event(postsChangeEvent));
  return payload;
}

export async function incrementPostViewCount(slug: string): Promise<number> {
  const response = await fetch("/api/posts/views", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug }),
  });
  if (!response.ok) throw new Error("บันทึกยอดเข้าชมไม่สำเร็จ");
  const payload: unknown = await response.json();
  if (typeof payload !== "object" || payload === null || !("count" in payload) || typeof payload.count !== "number")
    throw new Error("ยอดเข้าชมไม่ถูกต้อง");
  return payload.count;
}

export async function actOnPost(post: DemoPost, action: "duplicate" | "unpublish" | "delete" | "restore" | "purge" | "discardDraft"): Promise<DemoPost | null> {
  const response = await fetch(`/api/posts/${post.id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, revision: post.revision }),
  });
  const payload: unknown = await response.json();
  if (!response.ok) {
    const message = typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string"
      ? payload.error : "จัดการข่าวไม่สำเร็จ";
    throw new Error(message);
  }
  if (typeof payload !== "object" || payload === null || !("post" in payload) || (payload.post !== null && !isPost(payload.post)))
    throw new Error("ข้อมูลข่าวที่ตอบกลับไม่ถูกต้อง");
  const changed = payload.post as DemoPost | null;
  adminPosts = action === "duplicate" && changed ? [changed, ...adminPosts] : action === "restore" && changed ? [changed, ...adminPosts.filter((item) => item.id !== post.id)] : (action === "unpublish" || action === "discardDraft") && changed ? adminPosts.map((item) => item.id === post.id ? changed : item) : adminPosts.filter((item) => item.id !== post.id);
  publicPosts = action === "duplicate" || action === "discardDraft" ? publicPosts : publicPosts.filter((item) => item.id !== post.id);
  deletedPosts = action === "delete" ? [post, ...deletedPosts] : deletedPosts.filter((item) => item.id !== post.id);
  window.dispatchEvent(new Event(postsChangeEvent));
  return payload.post;
}
