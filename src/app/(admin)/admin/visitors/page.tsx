import { Suspense } from "react";
import { connection } from "next/server";
import { ArrowLeft, Eye, Monitor, MousePointer2, Smartphone } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/server/database/prisma";
import { bangkokDay } from "@/server/analytics/site-visits";
import { AdminContentLoading } from "@/components/admin/admin-content-loading";

const sourceLabels: Record<string, string> = { direct: "เข้าตรง / ไม่ทราบที่มา", search: "เครื่องมือค้นหา", social: "โซเชียลมีเดีย", other: "เว็บไซต์อื่น" };
const deviceLabels: Record<string, string> = { desktop: "คอมพิวเตอร์", mobile: "โทรศัพท์มือถือ", tablet: "แท็บเล็ต" };
const dateFormat = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" });
const asOfFormat = new Intl.DateTimeFormat("th-TH", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Bangkok" });

export default function VisitorsPage() {
  return <Suspense fallback={<AdminContentLoading/>}><VisitorReport /></Suspense>;
}

async function VisitorReport() {
  await connection();
  const asOf = new Date();
  const today = bangkokDay(asOf);
  const firstDay = new Date(today.getTime() - 29 * 86400000);
  const firstInstant = new Date(firstDay.getTime() - 7 * 3600000);
  const [days, sources, devices, landingPages] = await Promise.all([
    prisma.siteVisitDaily.findMany({ where: { day: { gte: firstDay, lte: today } }, orderBy: { day: "asc" }, select: { day: true, visits: true } }),
    prisma.siteVisitSession.groupBy({ by: ["source"], where: { startedAt: { gte: firstInstant } }, _count: { _all: true } }),
    prisma.siteVisitSession.groupBy({ by: ["device"], where: { startedAt: { gte: firstInstant } }, _count: { _all: true } }),
    prisma.siteVisitSession.groupBy({ by: ["landingPath"], where: { startedAt: { gte: firstInstant } }, _count: { _all: true }, orderBy: { _count: { landingPath: "desc" } }, take: 10 }),
  ]);
  const byDay = new Map(days.map((row) => [row.day.toISOString().slice(0, 10), row.visits]));
  const series = Array.from({ length: 30 }, (_, index) => {
    const day = new Date(firstDay.getTime() + index * 86400000);
    return { day, visits: byDay.get(day.toISOString().slice(0, 10)) ?? 0 };
  });
  const total = series.reduce((sum, row) => sum + row.visits, 0);
  const max = Math.max(1, ...series.map((row) => row.visits));
  const todayVisits = series[series.length - 1].visits;
  const sortedSources = [...sources].sort((a, b) => b._count._all - a._count._all);
  const sortedDevices = [...devices].sort((a, b) => b._count._all - a._count._all);

  return <div className="visitor-report-page">
    <header className="visitor-report-header"><div><Link href="/admin" className="visitor-report-back"><ArrowLeft size={16}/>กลับหน้าภาพรวม</Link><h1>รายงานผู้เข้าชมเว็บไซต์</h1><p>จำนวนครั้งที่เข้าชมหน้าสาธารณะ ไม่ใช่จำนวนผู้เข้าชมที่ไม่ซ้ำกัน</p></div></header>
    <div className="visitor-report-stats"><article><Eye size={20}/><span>วันนี้</span><strong>{todayVisits.toLocaleString("th-TH")}</strong><small>ครั้ง</small></article><article><MousePointer2 size={20}/><span>30 วันที่ผ่านมา</span><strong>{total.toLocaleString("th-TH")}</strong><small>ครั้ง</small></article></div>
    <p className="visitor-report-asof">ข้อมูล ณ วันที่ {asOfFormat.format(asOf)} · เวลาไทย (Asia/Bangkok)</p>
    <section className="visitor-report-panel"><div className="visitor-report-panel-heading"><h2>ยอดเข้าชมรายวัน</h2><span>30 วันล่าสุด</span></div><div className="visitor-report-days">{series.map((row) => <div className="visitor-report-day" key={row.day.toISOString()}><span>{dateFormat.format(row.day)}</span><div className="visitor-report-track"><i style={{ width: `${row.visits ? Math.max(3, row.visits / max * 100) : 0}%` }}/></div><strong>{row.visits.toLocaleString("th-TH")}</strong></div>)}</div></section>
    <div className="visitor-report-grid"><section className="visitor-report-panel"><div className="visitor-report-panel-heading"><h2>แหล่งที่มา</h2><span>30 วันล่าสุด</span></div><ReportList rows={sortedSources.map((row) => ({ name: sourceLabels[row.source] ?? row.source, count: row._count._all }))}/></section><section className="visitor-report-panel"><div className="visitor-report-panel-heading"><h2>ประเภทอุปกรณ์</h2><Monitor size={18}/><Smartphone size={18}/></div><ReportList rows={sortedDevices.map((row) => ({ name: deviceLabels[row.device] ?? row.device, count: row._count._all }))}/></section></div>
    <section className="visitor-report-panel"><div className="visitor-report-panel-heading"><h2>หน้าแรกที่เข้าชมบ่อย</h2><span>สูงสุด 10 หน้า · 30 วันล่าสุด</span></div><ReportList rows={landingPages.map((row) => ({ name: row.landingPath, count: row._count._all }))}/></section>
    <p className="visitor-report-note">ข้อมูลแหล่งที่มาและอุปกรณ์เป็นเพียงการจัดกลุ่มโดยคร่าว ๆ รายละเอียดรอบการเข้าชมเก็บประมาณ 90 วัน และไม่นับผู้ดูแลระบบหรือบอตที่รู้จัก</p>
  </div>;
}

function ReportList({ rows }: { rows: { name: string; count: number }[] }) {
  if (!rows.length) return <p className="visitor-report-empty">ยังไม่มีข้อมูลในช่วงเวลานี้</p>;
  const max = Math.max(...rows.map((row) => row.count));
  return <div className="visitor-report-list">{rows.map((row) => <div className="visitor-report-list-row" key={row.name}><div><span title={row.name}>{row.name}</span><strong>{row.count.toLocaleString("th-TH")}</strong></div><div className="visitor-report-track"><i style={{ width: `${row.count / max * 100}%` }}/></div></div>)}</div>;
}
