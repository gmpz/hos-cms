import { CircleCheck, FilePenLine } from "lucide-react";

export type StatusBadgeStatus = "draft" | "scheduled" | "published" | "unpublished" | "archived" | "active" | "inactive";
const statusMap: Record<StatusBadgeStatus, { label: string; className: string }> = {
  draft: { label: "ฉบับร่าง", className: "draft" }, scheduled: { label: "ตั้งเวลาเผยแพร่", className: "scheduled" },
  published: { label: "เผยแพร่", className: "published" }, unpublished: { label: "ยกเลิกเผยแพร่", className: "inactive" }, archived: { label: "เก็บถาวร", className: "archived" },
  active: { label: "ใช้งาน", className: "active" }, inactive: { label: "ไม่ใช้งาน", className: "inactive" },
};
export function StatusBadge({ status, size = "small" }: { status: StatusBadgeStatus; size?: "small" | "large" }) {
  const value = statusMap[status];
  if (status === "published") return <span className="status-text-published"><CircleCheck size={14} aria-hidden="true" />{value.label}</span>;
  if (status === "draft") return <span className="status-text-draft"><FilePenLine size={14} aria-hidden="true" />{value.label}</span>;
  return <span className={`status-pill ${value.className} ${size}`}>{value.label}</span>;
}

export function PendingDraftStatus() {
  return <small className="status-text-pending"><FilePenLine size={13} aria-hidden="true" />มีร่างรอเผยแพร่</small>;
}
