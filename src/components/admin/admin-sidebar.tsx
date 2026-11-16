"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

type Props = { open: boolean; collapsed: boolean; onClose: () => void };
type LinkItem = { type: "link"; label: string; href: string; icon: string };
type GroupItem = { type: "group"; id: string; label: string; icon: string; children: { label: string; href: string }[] };
type MenuItem = LinkItem | GroupItem;

const menu: MenuItem[] = [
  { type: "link", label: "ภาพรวม", href: "/admin", icon: "⌂" },
  { type: "link", label: "รายงานผู้เข้าชม", href: "/admin/visitors", icon: "◉" },
  { type: "group", id: "website", label: "เว็บไซต์", icon: "▦", children: [
    { label: "หน้าเว็บไซต์", href: "/admin/pages" },
    { label: "เมนูนำทาง", href: "/admin/navigation" },
    { label: "หน้าต้อนรับ", href: "/admin/splash-screens" },
    { label: "ประกาศเมื่อเข้าเว็บ", href: "/admin/announcements" },
  ]},
  { type: "group", id: "content", label: "เนื้อหา", icon: "▤", children: [
    { label: "ข่าวและผลงาน", href: "/admin/posts" },
    { label: "หมวดหมู่", href: "/admin/categories?scope=posts" },
    { label: "หน่วยงาน", href: "/admin/units" },
    { label: "เอกสาร", href: "/admin/documents" },
  ]},
  { type: "link", label: "คลังสื่อ", href: "/admin/media", icon: "▧" },
  { type: "group", id: "users", label: "ผู้ใช้งาน", icon: "♙", children: [
    { label: "บุคลากร", href: "/admin/users" },
    { label: "ข้อมูลบุคลากร", href: "/admin/profile-masters" },
  ]},
  { type: "group", id: "settings", label: "ตั้งค่า", icon: "⚙", children: [
    { label: "ข้อมูลโรงพยาบาล", href: "/admin/settings" },
    { label: "สีธีมและโลโก้", href: "/admin/settings/theme" },
    { label: "บันทึกกิจกรรม", href: "/admin/activity" },
  ]},
];

function active(pathname: string, href: string) {
  const target = href.split("?")[0];
  return target === "/admin" || target === "/admin/settings"
    ? pathname === target
    : pathname === target || pathname.startsWith(target + "/");
}

export function AdminSidebar({ open, collapsed, onClose }: Props) {
  const pathname = usePathname();
  const [groups, setGroups] = useState<Record<string, boolean>>({
    website: true, content: true, users: true, settings: true,
  });

  return <><button className={"admin-overlay " + (open ? "show" : "")} aria-label="ปิดเมนู" onClick={onClose}/>
    <aside className={"admin-sidebar " + (open ? "open " : "") + (collapsed ? "collapsed" : "")}>
      <div className="admin-brand">
        <Image src="/hospital-logo.png" width={48} height={48} alt="โลโก้โรงพยาบาลคลองหลวง"/>
        <div><strong>Hospital CMS</strong><small>โรงพยาบาลคลองหลวง</small></div>
      </div>
      <nav aria-label="เมนูผู้ดูแล">
        {menu.map(item => item.type === "link" ? <Link key={item.href} href={item.href} title={collapsed ? item.label : undefined} aria-current={active(pathname,item.href) ? "page" : undefined} className={"admin-nav-link " + (active(pathname,item.href) ? "active" : "")} onClick={onClose}><span>{item.icon}</span><b>{item.label}</b></Link> : <div className="admin-nav-group" key={item.id}>
          <button type="button" title={collapsed ? item.label : undefined} aria-expanded={groups[item.id]} onClick={() => setGroups({...groups,[item.id]:!groups[item.id]})}><span>{item.icon}</span><b>{item.label}</b><ChevronDown className="admin-nav-chevron" size={16} aria-hidden="true" /></button>
          <div className={"admin-submenu " + (groups[item.id] ? "expanded" : "")}>{item.children.map(child => <Link key={child.href} href={child.href} aria-current={active(pathname,child.href) ? "page" : undefined} className={active(pathname,child.href) ? "active" : ""} onClick={onClose}>{child.label}</Link>)}</div>
        </div>)}
      </nav>
      <div className="admin-user"><span>ผด</span><div><strong>ผู้ดูแลระบบ</strong><small>Administrator</small></div></div>
    </aside>
  </>;
}
