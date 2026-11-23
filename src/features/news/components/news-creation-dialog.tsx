"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { FilePenLine, LayoutTemplate, X } from "lucide-react";
import "./news-creation-dialog.css";

export function NewsCreationDialog({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <dialog ref={ref} className="news-creation-dialog" aria-labelledby="news-creation-title" onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="news-creation-dialog-panel">
      <header><div><h2 id="news-creation-title">สร้างข่าวแบบไหนดี?</h2><p>เลือกวิธีเขียนให้เหมาะกับข่าวนี้</p></div><button type="button" aria-label="ปิด" onClick={onClose}><X size={18}/></button></header>
      <div className="news-creation-choices">
        <Link href="/admin/posts/new?mode=form" onClick={onClose}><span><LayoutTemplate size={24}/></span><strong>ใช้แบบฟอร์ม</strong><small>กรอกข้อมูลตามช่องที่กำหนด ลงข่าวได้รวดเร็ว</small><b>เริ่มด้วยแบบฟอร์ม →</b></Link>
        <Link href="/admin/posts/new?mode=blocks" onClick={onClose}><span><FilePenLine size={24}/></span><strong>เขียนเอง</strong><small>จัดเนื้อหาและรูปแบบด้วยบล็อกได้อิสระ</small><b>เริ่มเขียนเอง →</b></Link>
      </div>
    </div>
  </dialog>;
}
