import Link from "next/link";
import { Eye, FileText, Search, Settings2, UserCog } from "lucide-react";
import { setActivityDateParams, type ActivityDateRange } from "../date-range";
import { AdminTablePagination } from "@/components/admin/admin-table-pagination";

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

export function ActivityTableHead() {
  return <thead><tr><th scope="col">กิจกรรม</th><th scope="col">รายละเอียด</th><th scope="col">ผู้ดำเนินการ</th><th scope="col">วันและเวลา</th><th scope="col" className="admin-table-actions-heading">จัดการ</th></tr></thead>;
}

function createPageHref(page: number, query: string, type: string, range: ActivityDateRange, pageSize: number) {
  const params = new URLSearchParams();
  setActivityDateParams(params, range);
  if (query) params.set("q", query);
  if (type !== "all") params.set("type", type);
  if (pageSize !== 10) params.set("size", String(pageSize));
  if (page > 1) params.set("page", String(page));
  return `/admin/activity${params.size ? `?${params.toString()}` : ""}`;
}

function createDetailHref(id: string, page: number, query: string, type: string, range: ActivityDateRange, pageSize: number) {
  const listUrl = new URL(createPageHref(page, query, type, range, pageSize), "http://localhost");
  return `/admin/activity/${encodeURIComponent(id)}${listUrl.search}`;
}

export function ActivityManager({ activities, query, type, page, pageSize, pageCount, total, range }: {
  range: ActivityDateRange;
  activities: ActivityRow[]; query: string; type: string; page: number; pageSize: number; pageCount: number; total: number;
}) {
  const pageHref = (page: number, query: string, type: string) => createPageHref(page, query, type, range, pageSize);
  const detailHref = (id: string, page: number, query: string, type: string) => createDetailHref(id, page, query, type, range, pageSize);
  const formatDate = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" });
  return <section className="activity-table admin-data-table">
        <div className="admin-list-table-scroll admin-data-table-scroll" tabIndex={0} role="region" aria-label="ตารางบันทึกกิจกรรม เลื่อนซ้ายขวาได้">
          <table>
            <ActivityTableHead/>
            <tbody>
              {activities.map((item) => <tr key={item.id}>
                <td><div className="admin-table-primary activity-title-cell">
                  <span aria-hidden="true" className={`activity-table-icon ${item.entityType === "user" ? "activity-type--user" : item.entityType === "document" ? "activity-type--document" : ""}`}>{item.entityType === "user" ? <UserCog size={18}/> : item.entityType === "site-settings" || item.entityType === "navigation" ? <Settings2 size={18}/> : <FileText size={18}/>}</span>
                  <div><strong>{actionLabels[item.action] ?? item.action}</strong><small>{typeLabels[item.entityType] ?? item.entityType}</small></div>
                </div></td>
                <td className="activity-summary">{item.summary}</td>
                <td>{item.actorName}</td>
                <td><time dateTime={new Date(item.occurredAt).toISOString()}>{formatDate.format(new Date(item.occurredAt))}</time></td>
                <td><div className="admin-table-actions"><Link href={detailHref(item.id, page, query, type)} aria-label={`ดูรายละเอียด ${actionLabels[item.action] ?? item.action}`} title="ดูรายละเอียด"><Eye size={17}/></Link></div></td>
              </tr>)}
              {!activities.length ? <tr><td colSpan={5}><div className="activity-empty"><Search size={25}/><strong>ไม่พบกิจกรรมในช่วงวันที่และเงื่อนไขที่เลือก</strong><p>ลองเปลี่ยนช่วงวันที่ คำค้นหา หรือประเภทกิจกรรม</p></div></td></tr> : null}
            </tbody>
          </table>
        </div>
      {total > 0 ? <AdminTablePagination className="activity-pagination" page={page} pageCount={pageCount} pageSize={pageSize} total={total} label="เปลี่ยนหน้าบันทึกกิจกรรม" pageHref={pageHref(1, query, type)}/> : null}
  </section>;
}
