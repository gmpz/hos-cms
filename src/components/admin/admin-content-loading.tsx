export function AdminContentLoading({ label = "กำลังโหลดเนื้อหา..." }: { label?: string }) {
  return (
    <div className="admin-content-loading" role="status" aria-busy="true" aria-live="polite" aria-label={label}>
      <div className="admin-content-loading-indicator">
        <span className="public-route-loading-spinner" aria-hidden="true" />
        <span>{label}</span>
      </div>
    </div>
  );
}

type SkeletonCell = "primary" | "primary-single" | "title" | "text" | "number" | "badge" | "date" | "counts" | "actions";
type AdminTableKind = "news" | "documents" | "units" | "announcements" | "splash" | "users" | "activity" | "media";

const tablePatterns: Record<AdminTableKind, SkeletonCell[]> = {
  news: ["primary-single", "text", "text", "badge", "date", "actions"],
  documents: ["primary-single", "text", "text", "number", "badge", "counts", "actions"],
  units: ["number", "primary", "text", "badge", "date", "actions"],
  announcements: ["primary", "text", "number", "date", "badge", "actions"],
  splash: ["primary", "text", "date", "badge", "actions"],
  users: ["primary", "title", "badge", "badge", "badge", "date", "actions"],
  activity: ["primary", "text", "text", "date", "actions"],
  media: ["primary", "text", "text", "date", "text", "actions"],
};

function LoadingCell({ kind, list = false }: { kind: SkeletonCell; list?: boolean }) {
  const tagRole = list ? "cell" : undefined;
  if (kind === "primary" || kind === "primary-single") return <span className="admin-table-skeleton-primary" role={tagRole}>
    <i className="admin-table-skeleton-icon" />
    <i className="admin-table-skeleton-copy"><b />{kind === "primary" ? <b /> : null}</i>
  </span>;
  if (kind === "title") return <span className="admin-table-skeleton-copy admin-table-skeleton-title" role={tagRole}><b /><b /></span>;
  if (kind === "counts") return <span className="admin-table-skeleton-copy admin-table-skeleton-counts" role={tagRole}><b /><b /></span>;
  if (kind === "actions") return <span className="admin-table-skeleton-actions" role={tagRole}><i /><i /></span>;
  return <span className={`admin-table-skeleton-cell is-${kind}`} role={tagRole} />;
}

export function AdminTableLoadingRows({ kind, rows = 6 }: { kind: AdminTableKind; rows?: number }) {
  const pattern = tablePatterns[kind];
  return (
    <>
      {Array.from({ length: rows }, (_, row) => (
        <tr className="admin-table-skeleton-row" aria-hidden="true" key={row}>
          {pattern.map((cell, column) => (
            <td key={column}>
              <LoadingCell kind={cell} />
            </td>
          ))}
        </tr>
      ))}
      <tr className="admin-loading-announcement"><td colSpan={pattern.length} role="status">กำลังโหลดรายการ...</td></tr>
    </>
  );
}

export function AdminListLoadingRows({ rows = 6, rowClassName }: { rows?: number; rowClassName?: string }) {
  const pattern: SkeletonCell[] = ["number", "title", "number", "badge", "actions"];
  return <>
    {Array.from({ length: rows }, (_, row) => (
      <div className={`admin-list-skeleton-row${rowClassName ? ` ${rowClassName}` : ""}`} role="row" aria-hidden="true" key={row}>
        {pattern.map((cell, column) => <LoadingCell kind={cell} list key={column} />)}
      </div>
    ))}
    <span className="admin-loading-sr-only" role="status">กำลังโหลดรายการ...</span>
  </>;
}
