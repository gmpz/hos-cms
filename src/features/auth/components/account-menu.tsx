"use client";

import { ChevronDown, LayoutDashboard, LogOut, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { listenForDropdownDismissal } from "@/components/ui/dropdown-scroll";
import { personnelPhotoPositionStyle } from "@/features/units/components/personnel-photo-position";
import { logoutAction, publicLogoutAction } from "../actions";

type AccountMenuProps = {
  displayName: string;
  variant: "admin" | "public";
  role: "ADMIN" | "MEMBER";
  photoUrl?: string | null;
  photoFocusX?: number;
  photoFocusY?: number;
  photoZoom?: number;
};

export function AccountMenu({ displayName, variant, role, photoUrl, photoFocusX = 50, photoFocusY = 25, photoZoom = 100 }: AccountMenuProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function closeOnOutsideClick(event: PointerEvent) {
      if (event.target instanceof Node && !detailsRef.current?.contains(event.target)) detailsRef.current?.removeAttribute("open");
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") detailsRef.current?.removeAttribute("open");
    }
    const stopDismissal = listenForDropdownDismissal(
      () => detailsRef.current?.querySelector(".account-menu-dropdown"),
      (target) => target instanceof Node && Boolean(detailsRef.current?.contains(target)),
      () => detailsRef.current?.removeAttribute("open"),
    );
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
      stopDismissal();
    };
  }, []);

  return <details ref={detailsRef} className={`account-menu account-menu-${variant}`}>
    <summary aria-label={`เมนูบัญชี ${displayName}`}>
      <span
        className={`account-menu-avatar${photoUrl ? " has-photo" : ""}`}
        style={photoUrl ? { backgroundImage: `url(${photoUrl})`, ...personnelPhotoPositionStyle({ x: photoFocusX, y: photoFocusY }, photoZoom) } : undefined}
      >
        {photoUrl ? null : <UserRound size={16}/>} 
      </span>
      <span className="account-menu-name">{displayName}</span>
      <ChevronDown size={15} aria-hidden="true"/>
    </summary>
    <div className="account-menu-dropdown">
      <Link href="/profile" onClick={() => detailsRef.current?.removeAttribute("open")}><UserRound size={16}/>โปรไฟล์ของฉัน</Link>
      <Link href="/profile/security" onClick={() => detailsRef.current?.removeAttribute("open")}><ShieldCheck size={16}/>ความปลอดภัย</Link>
      {role === "ADMIN" && <Link href="/admin" onClick={() => detailsRef.current?.removeAttribute("open")}><LayoutDashboard size={16}/>จัดการแอดมิน</Link>}
      <form action={variant === "admin" ? logoutAction : publicLogoutAction}>
        <button type="submit"><LogOut size={16}/>ออกจากระบบ</button>
      </form>
    </div>
  </details>;
}
