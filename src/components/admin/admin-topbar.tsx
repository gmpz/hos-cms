"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountMenu } from "@/features/auth/components/account-menu";
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";

const labels: Record<string, string> = {
  admin: "CMS",
  pages: "หน้าเว็บไซต์",
  home: "หน้าแรก",
  builder: "Page Builder",
  navigation: "เมนูนำทาง",
  posts: "ข่าวและผลงาน",
  categories: "หมวดหมู่",
  new: "สร้างใหม่",
  edit: "แก้ไข",
  units: "หน่วยงาน",
  documents: "เอกสาร",
  moit: "MOIT",
  procurement: "จัดซื้อจัดจ้าง",
  media: "คลังสื่อ",
  settings: "ตั้งค่า",
  theme: "สีธีมและโลโก้",
  activity: "บันทึกกิจกรรม",
  users: "ผู้ใช้งาน",
};

type Props = {
  collapsed: boolean;
  onMenu: () => void;
  onToggle: () => void;
  displayName: string;
  photoUrl: string | null;
  photoFocusX: number;
  photoFocusY: number;
  photoZoom: number;
};

export function AdminTopbar({ collapsed, onMenu, onToggle, displayName, photoUrl, photoFocusX, photoFocusY, photoZoom }: Props) {
  const pathname = usePathname();
  const pathParts = pathname.split("/").filter(Boolean);
  const crumbs = pathParts.flatMap((part, index) => {
    const label = labels[part];
    return label ? [{ label, href: `/${pathParts.slice(0, index + 1).join("/")}` }] : [];
  });
  return (
    <header className="admin-topbar">
      <div className="admin-topbar-left">
        <button className="mobile-menu" aria-label="เปิดเมนู" onClick={onMenu}>
          <Menu size={22} aria-hidden="true"/>
        </button>
        <button
          className="collapse-menu"
          aria-label={collapsed ? "ขยายเมนู" : "ย่อเมนู"}
          title={collapsed ? "ขยายเมนู" : "ย่อเมนู"}
          aria-pressed={collapsed}
          onClick={onToggle}
        >
          {collapsed ? <PanelLeftOpen size={19} strokeWidth={1.8}/> : <PanelLeftClose size={19} strokeWidth={1.8}/>}
        </button>
        <nav className="public-breadcrumb" aria-label="Breadcrumb">
          {crumbs.map((crumb, i) => (
            <span key={crumb.href}>
              {i > 0 && <i>›</i>}
              {i === crumbs.length - 1
                ? <b aria-current="page">{crumb.label}</b>
                : <Link href={crumb.href}>{crumb.label}</Link>}
            </span>
          ))}
        </nav>
      </div>
      <div className="admin-topbar-actions">
        <AccountMenu displayName={displayName} variant="admin" role="ADMIN" photoUrl={photoUrl} photoFocusX={photoFocusX} photoFocusY={photoFocusY} photoZoom={photoZoom}/>
      </div>
    </header>
  );
}
