export function DocumentNewBadge({ isNew }: { isNew: boolean }) {
  return isNew ? <span className="news-new-badge news-new-badge-inline document-new-badge">ใหม่</span> : null;
}
