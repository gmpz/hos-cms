import { NewsEditorEntry } from "@/features/news/components/news-editor-entry";
import { AdminContentLoading } from "@/components/admin/admin-content-loading";
import { Suspense } from "react";

type Props = { searchParams: Promise<{ mode?: string }> };

export default function NewPostPage({ searchParams }: Props) {
  return <Suspense fallback={<AdminContentLoading/>}>
    <NewPostContent searchParams={searchParams}/>
  </Suspense>;
}

async function NewPostContent({ searchParams }: Props) {
  const { mode } = await searchParams;
  return <NewsEditorEntry key={`new-post-${mode}`} postId={null} initialMode={mode === "blocks" ? "blocks" : "form"} />;
}
