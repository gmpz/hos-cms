import Link from "next/link";
import { Suspense } from "react";
import { ArrowUpRight, Clock, Eye, FilePlus2, FileText, FolderArchive, Globe, Hospital, Images, Newspaper, Plus, Settings2, Upload, User, UserCog } from "lucide-react";
import { actionLabels } from "@/features/activity/components/activity-manager";
import { getAdminDashboardData } from "@/server/dashboard/repository";
import { AdminContentLoading } from "@/components/admin/admin-content-loading";

const activityIcons = { post: Newspaper, page: FileText, document: FolderArchive, media: Images, user: UserCog, "site-settings": Settings2, navigation: Settings2 };
const quickActions = [
  { label: "สร้างหน้าเว็บไซต์", href: "/admin/pages/new", icon: FilePlus2, tone: "blue", external: false },
  { label: "สร้างข่าวหรือผลงาน", href: "/admin/posts/new", icon: Newspaper, tone: "green", external: false },
  { label: "เพิ่มเอกสาร", href: "/admin/documents", icon: Upload, tone: "amber", external: false },
  { label: "เปิดเว็บไซต์ประชาชน", href: "/", icon: Globe, tone: "violet", external: true },
] as const;

export function AdminDashboard() {
  return <Suspense fallback={<AdminContentLoading/>}><DashboardContent/></Suspense>;
}

async function DashboardContent() {
  const data = await getAdminDashboardData();
  const stats = [
    { label: "หน้าเว็บไซต์", value: data.pages.total, note: `เผยแพร่ ${data.pages.published.toLocaleString("th-TH")} หน้า`, href: "/admin/pages", icon: FileText, tone: "blue" },
    { label: "ข่าวและผลงาน", value: data.posts.total, note: `เผยแพร่ ${data.posts.published.toLocaleString("th-TH")} รายการ`, href: "/admin/posts", icon: Newspaper, tone: "green" },
    { label: "เอกสาร", value: data.documents.total, note: `เผยแพร่ ${data.documents.published.toLocaleString("th-TH")} รายการ`, href: "/admin/documents", icon: FolderArchive, tone: "amber" },
    { label: "คลังสื่อ", value: data.media.total, note: `รูปภาพ ${data.media.images.toLocaleString("th-TH")} · ไฟล์ ${data.media.files.toLocaleString("th-TH")}`, href: "/admin/media", icon: Images, tone: "violet" },
  ] as const;
  const visitDate = new Intl.DateTimeFormat("th-TH", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(data.visits.asOf);
  const activityDate = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" });

  return <div className="overview-dashboard">
    <header className="overview-header"><div><p className="eyebrow">ภาพรวมระบบ</p><h1>สวัสดี {data.displayName} 👋</h1><p>ภาพรวมเว็บไซต์{data.hospitalName}</p></div><div className="overview-header-actions"><Link href="/admin/pages/new" className="primary-button"><Plus size={16}/>สร้างหน้าใหม่</Link><Link href="/admin/posts/new" className="secondary-button"><Newspaper size={16}/>สร้างข่าว</Link></div></header>
    <section className="overview-visitor-card" aria-label="จำนวนผู้เข้าชมเว็บไซต์วันนี้"><span className="overview-visitor-icon"><Eye size={22}/></span><div><h2>จำนวนผู้เข้าชม (ครั้ง)</h2><p>วันนี้ · ไม่นับการรีเฟรชซ้ำในรอบการใช้งาน 30 นาที</p><Link href="/admin/visitors" className="overview-visitor-link">ดูรายงานผู้เข้าชม →</Link></div><div className="overview-visitor-total"><strong>{data.visits.visits.toLocaleString("th-TH")}</strong><small>ข้อมูล ณ วันที่ {visitDate}</small></div></section>
    <section className="overview-stat-grid" aria-label="สถิติเนื้อหา">{stats.map((stat) => { const Icon = stat.icon; return <Link href={stat.href} key={stat.label} className="overview-stat-card"><div className={`overview-stat-icon ${stat.tone}`}><Icon size={21}/></div><ArrowUpRight className="overview-arrow" size={17}/><strong>{stat.value.toLocaleString("th-TH")}</strong><span>{stat.label}</span><small>{stat.note}</small></Link>; })}</section>
    <section className="overview-publication-grid" aria-label="สถานะการเผยแพร่"><article><p>เผยแพร่แล้ว</p><div><strong className="published">{data.published.toLocaleString("th-TH")}</strong><span>เนื้อหา</span></div><div className="overview-progress"><i className="published" style={{ width: `${data.publishedPercent}%` }}/></div></article><article><p>ฉบับร่าง</p><div><strong className="draft">{data.drafts.toLocaleString("th-TH")}</strong><span>เนื้อหา</span></div><div className="overview-progress"><i className="draft" style={{ width: `${data.draftPercent}%` }}/></div></article><article><p>หน่วยงานในโรงพยาบาล</p><div><strong className="units">{data.units.toLocaleString("th-TH")}</strong><span>หน่วยงาน</span></div><Link href="/admin/units">จัดการหน่วยงาน →</Link></article></section>
    <div className="overview-bottom-grid"><section className="overview-panel overview-activity"><div className="overview-panel-heading"><h2>กิจกรรมล่าสุด</h2><Link href="/admin/activity">ดูทั้งหมด</Link></div><div>{data.activities.length ? data.activities.map((activity) => { const Icon = activityIcons[activity.entityType as keyof typeof activityIcons] ?? FileText; return <article key={activity.id}><span className="activity-icon"><Icon size={17}/></span><div><p><span>{actionLabels[activity.action] ?? activity.action}:</span> <strong>{activity.summary}</strong></p><small><span><User size={12}/>{activity.actor?.displayName ?? "บัญชีที่ถูกลบ"}</span><span><Clock size={12}/><time dateTime={activity.occurredAt.toISOString()}>{activityDate.format(activity.occurredAt)}</time></span></small></div></article>; }) : <p className="overview-empty">ยังไม่มีกิจกรรมในระบบ</p>}</div></section><section className="overview-panel"><div className="overview-panel-heading"><h2>การดำเนินการด่วน</h2></div><div className="quick-actions">{quickActions.map((action) => { const Icon = action.icon; return <Link key={action.label} href={action.href} target={action.external ? "_blank" : undefined} rel={action.external ? "noopener noreferrer" : undefined}><span className={`quick-icon ${action.tone}`}><Icon size={17}/></span><strong>{action.label}</strong><ArrowUpRight size={16}/></Link>; })}</div><div className="hospital-summary"><Hospital size={18}/><div><strong>{data.homepagePublished ? "หน้าแรกเผยแพร่แล้ว" : "หน้าแรกยังไม่เผยแพร่"}</strong><small>{data.hospitalName}</small></div></div></section></div>
  </div>;
}
