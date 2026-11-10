import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, FileText, Search, Settings2, User, UserCog } from "lucide-react";
import { setActivityDateParams, type ActivityDateRange } from "../date-range";

export type ActivityRow = { id: string; action: string; summary: string; entityType: string; actorName: string; occurredAt: Date };

export const actionLabels: Record<string, string> = {
  "user.create": "สร้างบัญชีผู้ใช้", "user.update": "แก้ไขบัญชีผู้ใช้",
  "user.enable": "เปิดใช้งานบัญชี", "user.disable": "ปิดใช้งานบัญชี",
  "user.password.reset": "รีเซ็ตรหัสผ่าน", "user.password.change": "เปลี่ยนรหัสผ่าน", "user.sessions.revoke": "บังคับออกจากระบบ",
  "navigation.publish": "เผยแพร่เมนูนำทาง", "site-settings.update": "แก้ไขข้อมูลเว็บไซต์",
};
export const typeLabels: Record<string, string> = {
  user: "บัญชีผู้ใช้", page: "หน้าเว็บไซต์", post: "ข่าวสาร", category: "หมวดหมู่",
  document: "เอกสาร", navigation: "เมนูนำทาง", "site-settings": "ข้อมูลเว็บไซต์", "profile-master": "ข้อมูลโปรไฟล์",
};

function paginationItems(current: number, total: number) {
  if (total <= 9) return Array.from({ length: total }, (_, index) => index + 1);
  return [...new Set([1, 2, current - 1, current, current + 1, total - 1, total])]
    .filter((page) => page > 0 && page <= total)
    .sort((left, right) => left - right);
}

function createPageHref(page: number, query: string, type: string, range: ActivityDateRange) {
  const params = new URLSearchParams();
  setActivityDateParams(params, range);
  if (query) params.set("q", query);
  if (type !== "all") params.set("type", type);
  if (page > 1) params.set("page", String(page));
  return `/admin/activity${params.size ? `?${params.toString()}` : ""}`;
}

function createDetailHref(id: string, page: number, query: string, type: string, range: ActivityDateRange) {
  const listUrl = new URL(createPageHref(page, query, type, range), "http://localhost");
  return `/admin/activity/${encodeURIComponent(id)}${listUrl.search}`;
}

export function ActivityManager({ activities, query, type, page, pageCount, total, range }: {
  range: ActivityDateRange;
  activities: ActivityRow[]; query: string; type: string; page: number; pageCount: number; total: number;
}) {
  const pageNumbers = paginationItems(page, pageCount);
  const pageHref = (page: number, query: string, type: string) => createPageHref(page, query, type, range);
  const detailHref = (id: string, page: number, query: string, type: string) => createDetailHref(id, page, query, type, range);
  const formatDate = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" });
  return <>
      <div className="activity-list">
        {activities.map((item) => <article key={item.id}>
          <span aria-hidden="true" className={`activity-type ${item.entityType === "user" ? "activity-type--user" : item.entityType === "document" ? "activity-type--document" : ""}`}>{item.entityType === "user" ? <UserCog size={18}/> : item.entityType === "site-settings" || item.entityType === "navigation" ? <Settings2 size={18}/> : <FileText size={18}/>}</span>
          <div className="activity-description"><span className="activity-entity">{typeLabels[item.entityType] ?? item.entityType}</span><strong>{actionLabels[item.action] ?? item.action}</strong></div>
          <p className="activity-summary">{item.summary}</p>
          <span className="activity-user"><User size={15}/>{item.actorName}</span>
          <time dateTime={new Date(item.occurredAt).toISOString()}><CalendarDays size={15}/>{formatDate.format(new Date(item.occurredAt))}</time>
          <Link className="activity-detail-link" href={detailHref(item.id, page, query, type)}>ดูรายละเอียด <ChevronRight size={14}/></Link>
        </article>)}
        {!activities.length ? <div className="activity-empty"><Search size={25}/><strong>ไม่พบกิจกรรมในช่วงวันที่และเงื่อนไขที่เลือก</strong><p>ลองเปลี่ยนช่วงวันที่ คำค้นหา หรือประเภทกิจกรรม</p></div> : null}
      </div>
      {total > 0 ? <div className="pages-pagination documents-pagination activity-pagination">
        <p>แสดง {(page - 1) * 10 + 1}–{Math.min(page * 10, total)} จาก {total.toLocaleString("th-TH")} รายการ</p>
        <nav className="documents-pagination-full" aria-label="เปลี่ยนหน้าบันทึกกิจกรรม">
          {page === 1 ? <span className="activity-page-disabled" aria-label="หน้าก่อนหน้า"><ChevronLeft size={16}/></span> : <Link href={pageHref(page - 1, query, type)} aria-label="หน้าก่อนหน้า"><ChevronLeft size={16}/></Link>}
          {pageNumbers.map((pageNumber, index) => <span key={pageNumber}>{index > 0 && pageNumber - pageNumbers[index - 1] > 1 ? <i>…</i> : null}<Link href={pageHref(pageNumber, query, type)} className={pageNumber === page ? "active" : ""} aria-current={pageNumber === page ? "page" : undefined}>{pageNumber}</Link></span>)}
          {page === pageCount ? <span className="activity-page-disabled" aria-label="หน้าถัดไป"><ChevronRight size={16}/></span> : <Link href={pageHref(page + 1, query, type)} aria-label="หน้าถัดไป"><ChevronRight size={16}/></Link>}
        </nav>
        <nav className="documents-pagination-compact" aria-label="เปลี่ยนหน้าบันทึกกิจกรรมบนจอแคบ">
          {page === 1 ? <span className="activity-page-disabled" aria-label="หน้าก่อนหน้า"><ChevronLeft size={16}/></span> : <Link href={pageHref(page - 1, query, type)} aria-label="หน้าก่อนหน้า"><ChevronLeft size={16}/></Link>}
          <span className="documents-pagination-current">หน้า {page} จาก {pageCount}</span>
          {page === pageCount ? <span className="activity-page-disabled" aria-label="หน้าถัดไป"><ChevronRight size={16}/></span> : <Link href={pageHref(page + 1, query, type)} aria-label="หน้าถัดไป"><ChevronRight size={16}/></Link>}
        </nav>
      </div> : null}
  </>;
}
