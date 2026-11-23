import { NewsEditorEntry } from "@/features/news/components/news-editor-entry";
export const instant = false;
export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <NewsEditorEntry key={id} postId={id} />;
}
