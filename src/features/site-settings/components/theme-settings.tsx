"use client";

import {
  Check,
  Image as ImageIcon,
  LoaderCircle,
  RotateCcw,
  Save,
  X,
} from "lucide-react";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { ActionToast } from "@/components/admin/action-toast";
import { AdminContentLoading } from "@/components/admin/admin-content-loading";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { MediaPicker } from "@/features/media/components/media-picker";
import { PersonnelPhotoFocusEditor } from "@/features/units/components/personnel-photo-focus-editor";
import {
  mediaPreviewStyle,
} from "@/features/media/demo/media-registry";
import { displayMediaFor } from "@/features/media/resolved-media";
import { defaultTheme, type ThemeTokens } from "../types";
import { logoPositionStyle } from "../logo-position";
import {
  readSiteSettings,
  refreshSiteSettings,
  saveSiteSettings,
} from "../demo/storage";
import { SettingsHeading } from "./site-profile-settings";

const colorFields: Array<{
  key: keyof ThemeTokens;
  label: string;
  help: string;
}> = [
  { key: "primary", label: "สีหลัก", help: "Sidebar และปุ่มหลัก" },
  { key: "secondary", label: "สีรอง", help: "ลิงก์และองค์ประกอบเน้น" },
  { key: "accent", label: "สีเน้น", help: "จุดสังเกตและสถานะสำคัญ" },
  {
    key: "emergency",
    label: "สีฉุกเฉิน",
    help: "ข้อความเตือนและข้อมูลเร่งด่วน",
  },
  { key: "background", label: "สีพื้นหลัง", help: "พื้นหลังเว็บไซต์" },
  { key: "text", label: "สีข้อความ", help: "ข้อความหลักของเว็บไซต์" },
];
const themePresets: Array<{
  id: string;
  name: string;
  description: string;
  theme: ThemeTokens;
}> = [
  {
    id: "hospital-blue",
    name: "แบบที่ 1 · น้ำเงินทางการ",
    description: "สุขุม น่าเชื่อถือ เหมาะกับเว็บไซต์ราชการและโรงพยาบาล",
    theme: {
      primary: "#082E63",
      secondary: "#087B91",
      accent: "#D9252A",
      emergency: "#C81E1E",
      background: "#FFFFFF",
      text: "#0A3156",
    },
  },
  {
    id: "hospital-green",
    name: "แบบที่ 2 · เขียวสุขภาพ",
    description: "เป็นมิตร สดชื่น ให้ความรู้สึกเกี่ยวกับสุขภาพและชุมชน",
    theme: {
      primary: "#14532D",
      secondary: "#0F766E",
      accent: "#D97706",
      emergency: "#C81E1E",
      background: "#FFFFFF",
      text: "#17352A",
    },
  },
  {
    id: "mourning",
    name: "แบบที่ 3 · ไว้อาลัย",
    description: "โทนดำ เทา และทองสุภาพ สำหรับช่วงประกาศไว้ทุกข์หรือไว้อาลัย",
    theme: {
      primary: "#1F2933",
      secondary: "#4B5563",
      accent: "#A88A55",
      emergency: "#B42318",
      background: "#F7F7F5",
      text: "#202124",
    },
  },
  {
    id: "hospital-mint",
    name: "แบบที่ 4 · เขียวมิ้นต์",
    description:
      "นุ่มนวล ทันสมัย และเป็นมิตร อิงโทนเขียวอมฟ้าจากสื่อประชาสัมพันธ์",
    theme: defaultTheme,
  },
];

function sameTheme(left: ThemeTokens, right: ThemeTokens) {
  return colorFields.every(
    (field) => left[field.key].toUpperCase() === right[field.key].toUpperCase(),
  );
}

export function ThemeSettings() {
  const [settings, setSettings] = useState(() => readSiteSettings());
  const [picker, setPicker] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"reset" | "save" | null>(
    null,
  );
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
          setToast({ ok: false, message: "โหลดธีมเว็บไซต์ไม่สำเร็จ" });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  if (loading) return <AdminContentLoading />;
  const logo = displayMediaFor(settings, "logoMediaId");
  const logoStyle = logo
    ? { ...mediaPreviewStyle(logo), ...logoPositionStyle(settings) }
    : { backgroundImage: "url(/hospital-logo.png)" };
  const previewStyle = {
    "--preview-primary": settings.theme.primary,
    "--preview-secondary": settings.theme.secondary,
    "--preview-accent": settings.theme.accent,
    "--preview-emergency": settings.theme.emergency,
    "--preview-bg": settings.theme.background,
    "--preview-text": settings.theme.text,
  } as CSSProperties;
  function setTheme(key: keyof ThemeTokens, value: string) {
    setSaved(false);
    setSettings((current) => ({
      ...current,
      theme: { ...current.theme, [key]: value.toUpperCase() },
    }));
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
      setToast({ ok: true, message: "อัปเดตธีมและโลโก้เรียบร้อย" });
    } catch (error) {
      setToast({
        ok: false,
        message: error instanceof Error ? error.message : "บันทึกธีมไม่สำเร็จ",
      });
    } finally {
      saving.current = false;
      setPending(false);
      setConfirmAction(null);
    }
  }
  return (
    <div className="settings-page theme-settings-page">
      {toast ? (
        <ActionToast
          ok={toast.ok}
          title={toast.ok ? "บันทึกธีมแล้ว" : "บันทึกไม่สำเร็จ"}
          description={toast.message}
          onClose={() => setToast(null)}
        />
      ) : null}
      <SettingsHeading
        eyebrow=""
        title="สีธีมและโลโก้"
        description="กำหนดอัตลักษณ์ส่วนกลางให้กับเว็บไซต์ทั้งหมด"
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
            type="button"
            disabled={pending}
            onClick={() => setConfirmAction("reset")}
          >
            <RotateCcw size={15} />
            คืนค่าเริ่มต้น
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={saved || pending}
            onClick={() => setConfirmAction("save")}
          >
            {pending ? (
              <LoaderCircle className="profile-submit-spinner" size={15} />
            ) : saved ? (
              <Check size={15} />
            ) : (
              <Save size={15} />
            )}{" "}
            {pending ? "กำลังบันทึก..." : saved ? "บันทึกแล้ว" : "บันทึกธีม"}
          </button>
        </div>
      </SettingsHeading>
      <div className="theme-settings-layout">
        <div>
          <section className="settings-card">
            <header>
              <span>
                <ImageIcon size={18} />
              </span>
              <div>
                <h2>โลโก้โรงพยาบาล</h2>
                <p>แนะนำไฟล์ PNG พื้นหลังโปร่งใสหรือภาพสี่เหลี่ยมจัตุรัส</p>
              </div>
            </header>
            <div className="logo-setting">
              <div style={logoStyle} />
              <span>
                <strong>{logo?.name ?? "โลโก้เริ่มต้นของโรงพยาบาล"}</strong>
                <small>ใช้ใน Sidebar และส่วนหัวเว็บไซต์</small>
                <span className="logo-setting-actions">
                  <button type="button" onClick={() => setPicker(true)}>
                    เลือกจากคลังสื่อ
                  </button>
                  {settings.logoMediaId ? (
                    <button
                      type="button"
                      className="danger"
                      onClick={() => {
                        setSettings({
                          ...settings,
                          logoMediaId: null,
                          logoFocusX: 50,
                          logoFocusY: 50,
                          logoZoom: 100,
                        });
                        setSaved(false);
                      }}
                    >
                      <X size={14} />
                      ใช้โลโก้เริ่มต้น
                    </button>
                  ) : null}
                </span>
              </span>
            </div>
            {logo ? (
              <div className="theme-logo-focus">
                <PersonnelPhotoFocusEditor
                  subject="โลโก้"
                  resetFocus={{ x: 50, y: 50 }}
                  imageStyle={mediaPreviewStyle(logo)}
                  value={{ x: settings.logoFocusX, y: settings.logoFocusY }}
                  onChange={({ x, y }) => {
                    setSettings((current) => ({
                      ...current,
                      logoFocusX: x,
                      logoFocusY: y,
                    }));
                    setSaved(false);
                  }}
                  zoom={settings.logoZoom}
                  onZoomChange={(zoom) => {
                    setSettings((current) => ({ ...current, logoZoom: zoom }));
                    setSaved(false);
                  }}
                />
              </div>
            ) : null}
          </section>
          <section className="settings-card theme-color-card">
            <header>
              <span className="theme-swatch" />
              <div>
                <h2>ชุดสีเว็บไซต์</h2>
                <p>เลือกธีมสำเร็จรูป หรือปรับรายละเอียดของแต่ละสีเพิ่มเติม</p>
              </div>
            </header>
            <div className="theme-presets">
              {themePresets.map((preset) => {
                const selected = sameTheme(settings.theme, preset.theme);
                return (
                  <button
                    key={preset.id}
                    className={selected ? "selected" : ""}
                    onClick={() => {
                      setSettings({ ...settings, theme: preset.theme });
                      setSaved(false);
                    }}
                    aria-pressed={selected}
                  >
                    <span className="theme-preset-colors">
                      <i style={{ background: preset.theme.primary }} />
                      <i style={{ background: preset.theme.secondary }} />
                      <i style={{ background: preset.theme.accent }} />
                    </span>
                    <span>
                      <strong>{preset.name}</strong>
                      <small>{preset.description}</small>
                    </span>
                    {selected ? <Check size={17} /> : null}
                  </button>
                );
              })}
            </div>
            <div className="theme-custom-heading">
              <strong>ปรับแต่งสีเพิ่มเติม</strong>
              <small>
                หากแก้ไขจากค่าสำเร็จรูป ระบบจะใช้เป็นชุดสีแบบกำหนดเอง
              </small>
            </div>
            <div className="theme-color-grid">
              {colorFields.map((field) => (
                <label key={field.key}>
                  <span>
                    {field.label}
                    <small>{field.help}</small>
                  </span>
                  <div>
                    <input
                      type="color"
                      value={settings.theme[field.key]}
                      onChange={(event) =>
                        setTheme(field.key, event.target.value)
                      }
                    />
                    <input
                      value={settings.theme[field.key]}
                      maxLength={7}
                      pattern="#[0-9A-Fa-f]{6}"
                      onChange={(event) =>
                        setTheme(field.key, event.target.value)
                      }
                    />
                  </div>
                </label>
              ))}
            </div>
          </section>
        </div>
        <aside className="theme-live-preview" style={previewStyle}>
          <strong className="theme-preview-title">ตัวอย่างสีและโลโก้</strong>
          <p className="theme-preview-note">
            ภาพจำลองเพื่อดูสีและโลโก้ก่อนบันทึก ไม่ใช่หน้าเว็บไซต์จริง
          </p>
          <div className="theme-preview-window">
            <header>
              <span style={logoStyle} />
              <strong>{settings.name}</strong>
            </header>
            <nav>
              <b>หน้าแรก</b>
              <span>ข่าวสาร</span>
              <span>เอกสาร</span>
            </nav>
            <div className="theme-preview-body">
              <small>โรงพยาบาลคลองหลวง</small>
              <h2>บริการสุขภาพที่ประชาชนเข้าถึงได้</h2>
              <p>ตัวอย่างการใช้สีหลัก สีรอง และสีข้อความบนเว็บไซต์ประชาชน</p>
              <button>ดูบริการของเรา</button>
            </div>
          </div>
          <div className="theme-preview-palette" aria-label="ตัวอย่างสีของธีม">
            <span>
              <i className="primary" />
              สีหลัก
            </span>
            <span>
              <i className="secondary" />
              สีรอง
            </span>
            <span>
              <i className="accent" />
              สีเน้น
            </span>
            <span>
              <i className="emergency" />
              สีฉุกเฉิน
            </span>
          </div>
        </aside>
      </div>
      {picker ? (
        <MediaPicker
          open
          currentId={settings.logoMediaId}
          onClose={() => setPicker(false)}
          onSelect={(media) => {
            setSettings({
              ...settings,
              logoMediaId: media.id,
              logoFocusX: 50,
              logoFocusY: 50,
              logoZoom: 100,
            });
            setSaved(false);
            setPicker(false);
          }}
        />
      ) : null}
      {confirmAction === "reset" ? (
        <ConfirmDialog
          variant="default"
          title="คืนค่าสีธีมและโลโก้เป็นค่าเริ่มต้น?"
          description="สีและโลโก้ที่กำลังแก้ไขจะกลับเป็นค่าเริ่มต้น การเปลี่ยนแปลงจะมีผลกับเว็บไซต์เมื่อกดบันทึกธีม"
          confirmLabel="คืนค่าเริ่มต้น"
          onClose={() => setConfirmAction(null)}
          onConfirm={() => {
            setSettings((current) => ({
              ...current,
              theme: defaultTheme,
              logoMediaId: null,
              logoFocusX: 50,
              logoFocusY: 50,
              logoZoom: 100,
            }));
            setSaved(false);
            setConfirmAction(null);
          }}
        />
      ) : null}
      {confirmAction === "save" ? (
        <ConfirmDialog
          variant="default"
          title="บันทึกธีมและโลโก้?"
          description="สีและโลโก้ที่เลือกจะถูกนำไปใช้กับเว็บไซต์หลังบันทึก"
          confirmLabel="บันทึกธีม"
          pending={pending}
          pendingLabel="กำลังบันทึก..."
          onClose={() => {
            if (!saving.current) setConfirmAction(null);
          }}
          onConfirm={() => void save()}
        />
      ) : null}
    </div>
  );
}
