export function AdminContentLoading() {
  return (
    <div className="admin-content-loading" role="status" aria-live="polite" aria-label="กำลังโหลดเนื้อหา">
      <div className="admin-content-loading-indicator" aria-hidden="true">
        <span className="admin-content-loading-dots"><i /><i /><i /></span>
        <b className="admin-content-loading-percentage" />
        <p>กรุณารอสักครู่...</p>
      </div>
      <span className="admin-loading-sr-only">กำลังเตรียมเนื้อหา กรุณารอสักครู่</span>
    </div>
  );
}

export function AdminTableLoadingRows({ columns, rows = 6 }: { columns: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, row) => (
        <tr className="admin-table-skeleton-row" aria-hidden="true" key={row}>
          {Array.from({ length: columns }, (_, column) => (
            <td key={column}>
              {column === 0 ? (
                <span className="admin-table-skeleton-primary">
                  <i className="admin-table-skeleton-icon" />
                  <i className="admin-table-skeleton-copy"><b /><b /></i>
                </span>
              ) : <span className={`admin-table-skeleton-cell tone-${(column + row) % 3}`} />}
            </td>
          ))}
        </tr>
      ))}
      <tr className="admin-loading-announcement"><td colSpan={columns} role="status">กำลังโหลดรายการ...</td></tr>
    </>
  );
}

export function AdminListLoadingRows({ columns, rows = 6, rowClassName }: { columns: number; rows?: number; rowClassName?: string }) {
  return <>
    {Array.from({ length: rows }, (_, row) => (
      <div className={`admin-list-skeleton-row${rowClassName ? ` ${rowClassName}` : ""}`} role="row" aria-hidden="true" style={rowClassName ? undefined : { gridTemplateColumns: `repeat(${columns}, minmax(90px, 1fr))` }} key={row}>
        {Array.from({ length: columns }, (_, column) => (
          <span className={`admin-table-skeleton-cell tone-${(column + row) % 3}`} role="cell" key={column} />
        ))}
      </div>
    ))}
    <span className="admin-loading-sr-only" role="status">กำลังโหลดรายการ...</span>
  </>;
}
