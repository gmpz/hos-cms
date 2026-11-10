import { ActivityManager } from "@/features/activity/components/activity-manager";
import { ActivityLoading } from "@/features/activity/components/activity-loading";
import { ActivityPendingCard } from "@/features/activity/components/activity-pending-card";
import { prisma } from "@/server/database/prisma";
import type { Prisma } from "@prisma/client";
import { connection } from "next/server";
import { Suspense } from "react";
import { activityDateRange, activityDateBounds } from "@/features/activity/date-range";
import { ActivityFilters } from "@/features/activity/components/activity-filters";
import { SettingsHeading } from "@/features/site-settings/components/site-profile-settings";
import { typeLabels } from "@/features/activity/components/activity-manager";
import type { ActivityDateRange } from "@/features/activity/date-range";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const pageSize = 10;

export default function ActivityPage({ searchParams }: Props) {
  return <main className="settings-page activity-page">
    <SettingsHeading eyebrow="" title="บันทึกกิจกรรม" description="ดูว่าใครทำอะไรในระบบ และดำเนินการเมื่อไร"/>
    <Suspense fallback={<ActivityPendingCard/>}><ActivityContent searchParams={searchParams}/></Suspense>
    <p className="activity-note">บันทึกนี้ใช้ตรวจสอบย้อนหลัง แก้ไขหรือลบจากหน้านี้ไม่ได้</p>
  </main>;
}

async function ActivityContent({ searchParams }: Props) {
  await connection();
  const params = await searchParams;
  const range = activityDateRange(params, new Date());
  const occurredAt = activityDateBounds(range);
  const query = (typeof params.q === "string" ? params.q : "").trim().slice(0, 100);
  const types = await prisma.auditLog.groupBy({ by: ["entityType"], where: { occurredAt } });
  const availableTypes = types.map((row) => row.entityType).sort();
  const requestedType = typeof params.type === "string" ? params.type : "";
  const type = availableTypes.includes(requestedType) ? requestedType : "all";
  const requestedPage = Number(typeof params.page === "string" ? params.page : "1");
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const formatDay = (date: string) => new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeZone: "Asia/Bangkok" }).format(new Date(`${date}T00:00:00+07:00`));
  return <section className="activity-card" aria-label="รายการบันทึกกิจกรรม">
    <div className="activity-card-toolbar">
      <div><h2>รายการกิจกรรม</h2><p>{formatDay(range.start)}{range.start !== range.end ? ` – ${formatDay(range.end)}` : ""} (เวลาไทย)</p></div>
      <ActivityFilters key={`${range.period}:${range.start}:${range.end}`} range={range} query={query} type={type} types={availableTypes} typeLabels={typeLabels}/>
    </div>
    <ActivityTableHeader/>
    <Suspense fallback={<ActivityLoading />}><ActivityRows range={range} query={query} type={type} page={page}/></Suspense>
  </section>;
}

function ActivityTableHeader() {
  return <div className="activity-list-header" role="row"><span>กิจกรรม</span><span>รายละเอียด</span><span>ผู้ดำเนินการ</span><span>วันและเวลา</span><span>จัดการ</span></div>;
}

async function ActivityRows({ range, query, type, page }: { range: ActivityDateRange; query: string; type: string; page: number }) {
  const where: Prisma.AuditLogWhereInput = {
    occurredAt: activityDateBounds(range),
    ...(type !== "all" ? { entityType: type } : {}),
    ...(query ? { OR: [
      { summary: { contains: query } },
      { action: { contains: query } },
      { actor: { is: { displayName: { contains: query } } } },
    ] } : {}),
  };
  const total = await prisma.auditLog.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);
  const rows = await prisma.auditLog.findMany({
    where,
    skip: (safePage - 1) * pageSize,
    take: pageSize,
    orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
    select: { id: true, action: true, summary: true, entityType: true, occurredAt: true, actor: { select: { displayName: true } } },
  });
  return <ActivityManager range={range} activities={rows.map((row) => ({ ...row, actorName: row.actor?.displayName ?? "บัญชีที่ถูกลบ" }))} query={query} type={type} page={safePage} pageCount={pageCount} total={total}/>;
}
