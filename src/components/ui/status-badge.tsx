export type StatusBadgeStatus = "draft" | "scheduled" | "published" | "unpublished" | "archived" | "active" | "inactive";
const statusMap: Record<StatusBadgeStatus, { label: string; className: string }> = {
  draft: { label: "ฉบับร่าง", className: "draft" }, scheduled: { label: "ตั้งเวลาเผยแพร่", className: "scheduled" },
  published: { label: "เผยแพร่", className: "published" }, unpublished: { label: "ยกเลิกเผยแพร่", className: "inactive" }, archived: { label: "เก็บถาวร", className: "archived" },
  active: { label: "ใช้งาน", className: "active" }, inactive: { label: "ไม่ใช้งาน", className: "inactive" },
};
export function StatusBadge({ status, size = "small" }: { status: StatusBadgeStatus; size?: "small" | "large" }) { const value = statusMap[status]; return <span className={`status-pill ${value.className} ${size}`}>{value.label}</span>; }
