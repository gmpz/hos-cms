import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, FileText, UserRound } from "lucide-react";
import { Suspense } from "react";
import { prisma } from "@/server/database/prisma";
import { actionLabels, typeLabels } from "@/features/activity/components/activity-manager";
import { validActivityDate } from "@/features/activity/date-range";
import { AdminContentLoading } from "@/components/admin/admin-content-loading";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function ActivityDetailPage({ params, searchParams }: Props) {
  return <Suspense fallback={<AdminContentLoading/>}>
    <ActivityDetailContent params={params} searchParams={searchParams}/>
  </Suspense>;
}

async function ActivityDetailContent({ params, searchParams }: Props) {
  const { id } = await params;
  const activity = await prisma.auditLog.findUnique({
    where: { id },
    select: {
      id: true, action: true, summary: true, entityType: true, entityId: true,
      occurredAt: true, actorId: true,
      actor: { select: { displayName: true, username: true } },
    },
  });
  if (!activity) notFound();

  const filters = await searchParams;
  const backParams = new URLSearchParams();
  if (typeof filters.period === "string" && ["today", "yesterday", "week", "custom"].includes(filters.period)) backParams.set("period", filters.period);
  if (filters.period === "custom" && validActivityDate(filters.start) && validActivityDate(filters.end)) {
    backParams.set("start", filters.start);
    backParams.set("end", filters.end);
  }
  if (typeof filters.q === "string" && filters.q.trim()) backParams.set("q", filters.q.trim().slice(0, 100));
  if (typeof filters.type === "string" && filters.type) backParams.set("type", filters.type);
  if (typeof filters.page === "string" && /^\d+$/.test(filters.page) && Number(filters.page) > 1) backParams.set("page", filters.page);
  const backHref = `/admin/activity${backParams.size ? `?${backParams.toString()}` : ""}`;
  const formattedDate = new Intl.DateTimeFormat("th-TH", { dateStyle: "full", timeStyle: "medium", timeZone: "Asia/Bangkok" }).format(activity.occurredAt);

  return <main className="settings-page activity-detail-page">
    <Link className="activity-detail-back" href={backHref}><ArrowLeft size={16}/> กลับไปบันทึกกิจกรรม</Link>
    <div className="activity-detail-heading">
      <span>{typeLabels[activity.entityType] ?? activity.entityType}</span>
      <h1>{actionLabels[activity.action] ?? activity.action}</h1>
      <p>{activity.summary}</p>
    </div>
    <section className="activity-detail-card" aria-label="รายละเอียดกิจกรรม">
      <h2><FileText size={19}/> ข้อมูลเหตุการณ์</h2>
      <dl>
        <div><dt>การดำเนินการ</dt><dd>{activity.action}</dd></div>
        <div><dt>ประเภทข้อมูล</dt><dd>{typeLabels[activity.entityType] ?? activity.entityType}</dd></div>
        <div><dt>รหัสรายการที่เกี่ยวข้อง</dt><dd className="activity-detail-id">{activity.entityId}</dd></div>
        <div><dt>รายละเอียดที่บันทึก</dt><dd>{activity.summary}</dd></div>
      </dl>
    </section>
    <section className="activity-detail-card" aria-label="ผู้ดำเนินการและเวลา">
      <h2><UserRound size={19}/> ผู้ดำเนินการและเวลา</h2>
      <dl>
        <div><dt>ผู้ดำเนินการ</dt><dd>{activity.actor?.displayName ?? "บัญชีที่ถูกลบหรือไม่สามารถระบุได้"}</dd></div>
        {activity.actor ? <div><dt>ชื่อผู้ใช้</dt><dd>{activity.actor.username}</dd></div> : null}
        {activity.actorId ? <div><dt>รหัสผู้ใช้</dt><dd className="activity-detail-id">{activity.actorId}</dd></div> : null}
        <div><dt><CalendarDays size={15}/> วันและเวลา</dt><dd><time dateTime={activity.occurredAt.toISOString()}>{formattedDate} (เวลาไทย)</time></dd></div>
        <div><dt>รหัสบันทึกกิจกรรม</dt><dd className="activity-detail-id">{activity.id}</dd></div>
      </dl>
    </section>
    <p className="activity-detail-note">ระบบบันทึกข้อมูลเหตุการณ์ตามที่แสดงข้างต้น โดยไม่ได้เก็บค่าก่อน–หลังการแก้ไขหรือ IP ในบันทึกนี้</p>
  </main>;
}
