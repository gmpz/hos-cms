import { NewsEditor } from "@/features/news/components/news-editor";
export const instant = false;
export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <NewsEditor key={id} postId={id} />;
}
