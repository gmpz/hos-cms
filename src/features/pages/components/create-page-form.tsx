"use client";

import {
  ArrowLeft,
  ArrowRight,
  FilePlus2,
  Globe2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createPageSummary } from "../demo/page-list-storage";
import { isReservedPagePath } from "../reserved-paths";

function normalizePath(value: string) {
  return value.trim().toLocaleLowerCase("en").replace(/^\/+|\/+$/g, "").replace(/\s+/g, "-").replace(/[^a-z0-9\-/]/g, "").replace(/\/{2,}/g, "/");
}

export function CreatePageForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [path, setPath] = useState("");
  const [pathEdited, setPathEdited] = useState(false);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const normalizedPath = normalizePath(path);

  function changeName(value: string) {
    setName(value);
    if (!pathEdited) setPath(normalizePath(value));
    setError("");
  }

  async function create() {
    if (creating) return;
    if (!name.trim()) return setError("กรุณากรอกชื่อหน้า");
    if (!normalizedPath) return setError("กรุณากรอก URL ของหน้าเป็นภาษาอังกฤษ");
    if (isReservedPagePath(normalizedPath)) return setError(`ไม่สามารถใช้ /${normalizedPath.split("/")[0]} ได้ เนื่องจากเป็นเส้นทางของระบบ`);
    if (normalizedPath.includes("..")) return setError("URL ไม่ถูกต้อง");
    setCreating(true);
    try {
    const page = await createPageSummary(name.trim(), normalizedPath);
    // Clear the cached form before leaving this route. The App Router can keep
    // client component state around for a fast back/forward navigation, so a
    // later "create page" visit must not restore the previous page details.
    setName("");
    setPath("");
    setPathEdited(false);
    setError("");
    router.replace(`/admin/pages/${page.id}/builder`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "สร้างหน้าไม่สำเร็จ");
    } finally { setCreating(false); }
  }

  return (
    <div className="create-page-screen">
      <header>
        <Link href="/admin/pages">
          <ArrowLeft size={16} />
          กลับหน้ารายการ
        </Link>
        <div className="create-page-heading">
          <span><FilePlus2 size={22} /></span>
          <div>
            <small>WEBSITE MANAGEMENT</small>
            <h1>สร้างหน้าเว็บไซต์ใหม่</h1>
            <p>ตั้งชื่อและกำหนด URL จากนั้นจึงจัดเนื้อหาด้วย Page Builder</p>
          </div>
        </div>
      </header>

      <div className="create-page-layout">
        <form
          className="create-page-card"
          onSubmit={(event) => {
            event.preventDefault();
            void create();
          }}
        >
          <header>
            <div>
              <strong>ข้อมูลหน้าเว็บไซต์</strong>
              <small>สามารถกลับมาแก้ชื่อและ URL ภายหลังได้</small>
            </div>
            <span>ฉบับร่าง</span>
          </header>
          <div className="create-page-fields">
            <label>
              <b>ชื่อหน้า <em>*</em></b>
              <input
                autoFocus
                value={name}
                onChange={(event) => changeName(event.target.value)}
                placeholder="เช่น ประวัติโรงพยาบาล"
              />
              <small>ชื่อนี้จะแสดงเป็นชื่อหน้าในระบบจัดการ</small>
            </label>
            <label>
              <b>URL ของหน้า <em>*</em></b>
              <div className="create-page-path-field">
                <span>เว็บไซต์/</span>
                <input
                  value={path}
                  onChange={(event) => {
                    setPathEdited(true);
                    setPath(event.target.value);
                    setError("");
                  }}
                  placeholder="hospital-history"
                />
              </div>
              <small>ใช้ตัวอักษรอังกฤษ ตัวเลข ขีดกลาง และ / สำหรับหน้าซ้อน</small>
            </label>
            <div className="create-page-url">
              <Globe2 size={18} />
              <span>
                <small>ตัวอย่าง URL</small>
                <strong>/{normalizedPath || "ชื่อ-url-ของหน้า"}</strong>
              </span>
            </div>
            {error ? <p className="create-page-error">{error}</p> : null}
          </div>
          <footer>
            <Link href="/admin/pages">ยกเลิก</Link>
            <button className="primary-button" type="submit" disabled={creating}>
              สร้างและเปิด Page Builder
              <ArrowRight size={16} />
            </button>
          </footer>
        </form>

      </div>
    </div>
  );
}
