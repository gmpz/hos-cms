import { AnnouncementsManager } from "@/features/announcements/components/announcements-manager";
import { listAnnouncements } from "@/server/announcements/repository";

export const instant = false;

export default async function AnnouncementsPage() {
  const announcements = await listAnnouncements();
  return <AnnouncementsManager initialItems={announcements} />;
}
