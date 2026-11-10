import { ActivityPendingCard } from "@/features/activity/components/activity-pending-card";
import { SettingsHeading } from "@/features/site-settings/components/site-profile-settings";

export default function Loading() { return <main className="settings-page activity-page"><SettingsHeading eyebrow="" title="บันทึกกิจกรรม" description="ดูว่าใครทำอะไรในระบบ และดำเนินการเมื่อไร"/><ActivityPendingCard/></main>; }
