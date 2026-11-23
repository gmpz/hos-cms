"use client";
import { useEffect, useState } from "react";
import { AdminContentLoading } from "@/components/admin/admin-content-loading";
import { NewsEditor } from "./news-editor";
import { NewsFormEditor } from "../form/news-form-editor";

export function NewsEditorEntry({ postId, initialMode = "form" }: { postId: string | null; initialMode?: "form" | "blocks" }) {
  const [mode, setMode] = useState<"form" | "blocks" | null>(postId ? null : initialMode);
  useEffect(() => {
    if (!postId) return;
    let active = true;
    void fetch(`/api/posts/${postId}`, { cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error("โหลดข่าวไม่สำเร็จ");
      return response.json() as Promise<{ post: { editorMode?: string } }>;
    }).then(({ post }) => { if (active) setMode(post.editorMode === "form" ? "form" : "blocks"); })
      .catch(() => { if (active) setMode("blocks"); });
    return () => { active = false; };
  }, [postId]);
  if (mode === null) return <AdminContentLoading label="กำลังโหลดข่าว..." />;
  return mode === "form" ? <NewsFormEditor postId={postId}/> : <NewsEditor postId={postId}/>;
}
