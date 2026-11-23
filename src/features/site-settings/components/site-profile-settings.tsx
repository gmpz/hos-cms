"use client";

import {
  Building2,
  Check,
  ExternalLink,
  LoaderCircle,
  Save,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ActionToast } from "@/components/admin/action-toast";
import { AdminContentLoading } from "@/components/admin/admin-content-loading";
import type { SiteSettings } from "../types";
import {
  readSiteSettings,
  refreshSiteSettings,
  saveSiteSettings,
} from "../demo/storage";

export function SiteProfileSettings() {
  const [settings, setSettings] = useState<SiteSettings>(() =>
    readSiteSettings(),
  );
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; message: string } | null>(
    null,
  );
  const saving = useRef(false);
  useEffect(() => {
    let active = true;
    void refreshSiteSettings()
      .then((value) => {
        if (active) setSettings(value);
      })
      .catch(() => {
        if (active)
          setToast({ ok: false, message: "โหลดข้อมูลเว็บไซต์ไม่สำเร็จ" });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  if (loading) return <AdminContentLoading />;

  function update<K extends keyof SiteSettings>(
    key: K,
    value: SiteSettings[K],
  ) {
    setSaved(false);
    setSettings((current) => ({ ...current, [key]: value }));
  }
  async function save() {
    if (saving.current || saved) return;
    saving.current = true;
    setPending(true);
    setToast(null);
    try {
      const next = await saveSiteSettings(settings);
      setSettings(next);
      setSaved(true);
      setToast({ ok: true, message: "อัปเดตข้อมูลโรงพยาบาลเรียบร้อย" });
    } catch (error) {
      setToast({
        ok: false,
        message:
          error instanceof Error ? error.message : "บันทึกข้อมูลไม่สำเร็จ",
      });
    } finally {
      saving.current = false;
      setPending(false);
    }
  }

  return (
    <div className="settings-page site-profile-settings-page">
      {toast ? (
        <ActionToast
          ok={toast.ok}
          title={toast.ok ? "บันทึกข้อมูลแล้ว" : "บันทึกไม่สำเร็จ"}
          description={toast.message}
          onClose={() => setToast(null)}
        />
      ) : null}
      <SettingsHeading
        eyebrow=""
        title="ข้อมูลโรงพยาบาล"
        description="ข้อมูลหลักที่ใช้ในส่วนหัว ท้ายเว็บไซต์ และหน้าติดต่อ"
      >
        <div className="settings-heading-actions">
          {/* <a
            className="settings-view-site"
            href="/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink size={16} /> ดูหน้าเว็บไซต์
          </a> */}
          <button
            className="primary-button"
            disabled={saved || pending}
            onClick={() => void save()}
          >
            {pending ? (
              <LoaderCircle className="profile-submit-spinner" size={16} />
            ) : saved ? (
              <Check size={16} />
            ) : (
              <Save size={16} />
            )}{" "}
            {pending
              ? "กำลังบันทึก..."
              : saved
                ? "บันทึกแล้ว"
                : "บันทึกข้อมูล"}
          </button>
        </div>
      </SettingsHeading>
      <div className="settings-layout">
        <section className="settings-card">
          <header>
            <span>
              <Building2 size={18} />
            </span>
            <div>
              <h2>ข้อมูลทั่วไป</h2>
              <p>ชื่อและข้อมูลติดต่ออย่างเป็นทางการ</p>
            </div>
          </header>
          <div className="settings-form">
            <label>
              <span>ชื่อโรงพยาบาล</span>
              <input
                value={settings.name}
                onChange={(event) => update("name", event.target.value)}
              />
            </label>
            <label>
              <span>ชื่อภาษาอังกฤษ</span>
              <input
                value={settings.englishName}
                onChange={(event) => update("englishName", event.target.value)}
              />
            </label>
            <label>
              <span>ที่อยู่</span>
              <textarea
                rows={4}
                value={settings.address}
                onChange={(event) => update("address", event.target.value)}
              />
            </label>
            <label>
              <span>ลิงก์ Google Maps</span>
              <input
                type="url"
                value={settings.mapUrl}
                maxLength={2048}
                placeholder="https://maps.app.goo.gl/..."
                onChange={(event) => update("mapUrl", event.target.value)}
              />
              <small>วางลิงก์แชร์ตำแหน่งจาก Google Maps (ไม่บังคับ)</small>
            </label>
            <div className="settings-form-grid">
              <label>
                <span>เบอร์โทรศัพท์</span>
                <input
                  value={settings.phone}
                  onChange={(event) => update("phone", event.target.value)}
                />
              </label>
              <label>
                <span>อีเมล</span>
                <input
                  type="email"
                  value={settings.email}
                  onChange={(event) => update("email", event.target.value)}
                />
              </label>
            </div>
            <div className="settings-social-fields">
              <h3>ช่องทางโซเชียล</h3>
              <p>กรอกเฉพาะบัญชีทางการที่ต้องการแสดงในท้ายเว็บไซต์</p>
              <label>
                <span>Facebook</span>
                <input
                  type="url"
                  value={settings.facebookUrl}
                  maxLength={2048}
                  placeholder="https://www.facebook.com/ชื่อเพจ"
                  onChange={(event) =>
                    update("facebookUrl", event.target.value)
                  }
                />
              </label>
              <label>
                <span>YouTube</span>
                <input
                  type="url"
                  value={settings.youtubeUrl}
                  maxLength={2048}
                  placeholder="https://www.youtube.com/@ชื่อช่อง"
                  onChange={(event) => update("youtubeUrl", event.target.value)}
                />
              </label>
              <label>
                <span>LINE Official</span>
                <input
                  type="url"
                  value={settings.lineUrl}
                  maxLength={2048}
                  placeholder="https://lin.ee/..."
                  onChange={(event) => update("lineUrl", event.target.value)}
                />
              </label>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export function SettingsHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="settings-heading">
      <div>
        {eyebrow ? <small>{eyebrow}</small> : null}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </header>
  );
}
