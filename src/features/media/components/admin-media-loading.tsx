import { AdminTableLoadingRows } from "@/components/admin/admin-content-loading";

type View = "grid" | "list";

export function AdminMediaLoading({ view, picker = false }: { view: View; picker?: boolean }) {
  if (picker) return view === "grid" ? (
    <div className="media-picker-grid admin-media-picker-skeleton" role="status" aria-label="กำลังโหลดไฟล์">
      {Array.from({ length: 6 }, (_, index) => <div className="admin-media-picker-card" aria-hidden="true" key={index}>
        <span className="media-picker-thumb admin-media-skeleton-shape" />
        <span className="admin-media-skeleton-shape admin-media-skeleton-name" />
      </div>)}
    </div>
  ) : (
    <div className="media-picker-list admin-media-picker-skeleton" role="status" aria-label="กำลังโหลดไฟล์">
      {Array.from({ length: 6 }, (_, index) => <div className="admin-media-picker-row" aria-hidden="true" key={index}>
        <span className="media-picker-thumb admin-media-skeleton-shape" />
        <span className="admin-media-skeleton-shape admin-media-skeleton-name" />
        <span className="admin-media-skeleton-shape admin-media-skeleton-size" />
      </div>)}
    </div>
  );

  return view === "grid" ? (
    <div className="media-grid admin-media-library-skeleton" role="status" aria-label="กำลังโหลดไฟล์">
      {Array.from({ length: 10 }, (_, index) => <div className="media-card admin-media-library-card" aria-hidden="true" key={index}>
        <div className="media-preview admin-media-skeleton-shape" />
        <div className="admin-media-library-card-copy"><i className="admin-media-skeleton-shape" /><i className="admin-media-skeleton-shape" /></div>
      </div>)}
    </div>
  ) : (
    <div className="media-table-wrap admin-data-table admin-data-table-scroll" role="status" aria-label="กำลังโหลดไฟล์">
      <table><thead><tr><th>ชื่อไฟล์</th><th>ขนาด</th><th>มิติ</th><th>วันที่</th><th>อัปโหลดโดย</th><th className="admin-table-actions-heading">จัดการ</th></tr></thead>
        <tbody><AdminTableLoadingRows kind="media" /></tbody>
      </table>
    </div>
  );
}
