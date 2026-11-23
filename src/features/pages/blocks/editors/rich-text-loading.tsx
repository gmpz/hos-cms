export function RichTextLoading() {
  return <div className="tiptap-loading" role="status" aria-label="กำลังเปิดเครื่องมือเขียน">
    <div className="tiptap-loading-toolbar" aria-hidden="true">
      <span className="wide"/><i/><span/><span/><span/><i/><span/><span/><span/><span/>
    </div>
    <div className="tiptap-loading-body" aria-hidden="true">
      <span className="admin-loading-shape"/>
      <span className="admin-loading-shape"/>
      <span className="admin-loading-shape"/>
      <span className="admin-loading-shape"/>
    </div>
  </div>;
}
