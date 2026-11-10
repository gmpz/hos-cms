import { notFound } from "next/navigation";
import { AnnouncementEditor } from "@/features/announcements/components/announcement-editor";
import { getAnnouncement } from "@/server/announcements/repository";

export const instant = false;

export default async function EditAnnouncementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await getAnnouncement(id);
  if (!item) notFound();
  return <AnnouncementEditor key={`${item.id}:${item.revision}`} item={item}/>;
}
