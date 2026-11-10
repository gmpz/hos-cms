import { Activity, Bell, BookOpen, BriefcaseBusiness, Building2, CalendarDays, ChartNoAxesColumn, CircleHelp, ClipboardList, Clock3, Contact, Download, ExternalLink, FileDown, FileText, FolderOpen, Globe, GraduationCap, Handshake, HeartPulse, Hospital, House, Image, Images, Info, Link, Mail, MapPin, Megaphone, Menu, Newspaper, Phone, Search, Settings, ShieldCheck, Star, Stethoscope, UserRound, Users, Video, type LucideIcon } from "lucide-react";
import type { NavigationIconName } from "./icon-names";

export const navigationIcons: Record<NavigationIconName, { label: string; Icon: LucideIcon }> = {
  house: { label: "หน้าแรก", Icon: House },
  newspaper: { label: "ข่าวสาร", Icon: Newspaper },
  building2: { label: "หน่วยงาน", Icon: Building2 },
  "file-text": { label: "เอกสาร", Icon: FileText },
  "folder-open": { label: "แฟ้ม", Icon: FolderOpen },
  contact: { label: "ติดต่อ", Icon: Contact },
  search: { label: "ค้นหา", Icon: Search },
  info: { label: "ข้อมูล", Icon: Info },
  "circle-help": { label: "ช่วยเหลือ", Icon: CircleHelp },
  menu: { label: "เมนู", Icon: Menu },
  "calendar-days": { label: "ปฏิทิน", Icon: CalendarDays },
  megaphone: { label: "ประกาศ", Icon: Megaphone },
  bell: { label: "แจ้งเตือน", Icon: Bell },
  images: { label: "คลังภาพ", Icon: Images },
  image: { label: "รูปภาพ", Icon: Image },
  video: { label: "วิดีโอ", Icon: Video },
  download: { label: "ดาวน์โหลด", Icon: Download },
  link: { label: "ลิงก์", Icon: Link },
  globe: { label: "เว็บไซต์", Icon: Globe },
  "map-pin": { label: "แผนที่", Icon: MapPin },
  phone: { label: "โทรศัพท์", Icon: Phone },
  mail: { label: "อีเมล", Icon: Mail },
  users: { label: "กลุ่มคน", Icon: Users },
  "user-round": { label: "ผู้ใช้", Icon: UserRound },
  "heart-pulse": { label: "สุขภาพ", Icon: HeartPulse },
  hospital: { label: "โรงพยาบาล", Icon: Hospital },
  stethoscope: { label: "การแพทย์", Icon: Stethoscope },
  activity: { label: "กิจกรรม", Icon: Activity },
  "shield-check": { label: "ความปลอดภัย", Icon: ShieldCheck },
  "clipboard-list": { label: "รายการ", Icon: ClipboardList },
  "book-open": { label: "คู่มือ", Icon: BookOpen },
  "graduation-cap": { label: "การเรียนรู้", Icon: GraduationCap },
  "briefcase-business": { label: "งาน", Icon: BriefcaseBusiness },
  handshake: { label: "ร่วมมือ", Icon: Handshake },
  "chart-no-axes-column": { label: "สถิติ", Icon: ChartNoAxesColumn },
  settings: { label: "ตั้งค่า", Icon: Settings },
  clock3: { label: "เวลา", Icon: Clock3 },
  star: { label: "แนะนำ", Icon: Star },
  "external-link": { label: "ลิงก์ภายนอก", Icon: ExternalLink },
  "file-down": { label: "ไฟล์ดาวน์โหลด", Icon: FileDown },
};

export function NavigationIcon({ name, size = 17 }: { name?: NavigationIconName; size?: number }) {
  if (!name) return null;
  const Icon = navigationIcons[name].Icon;
  return <Icon size={size} strokeWidth={1.9} aria-hidden="true" />;
}
