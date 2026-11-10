export function RichTextLoading() {
  return <div className="tiptap-loading" role="status" aria-label="กำลังเปิดเครื่องมือเขียน">
    <div className="tiptap-loading-toolbar" aria-hidden="true">
      <span className="wide"/><i/><span/><span/><span/><i/><span/><span/><span/><span/>
    </div>
    <div className="tiptap-loading-body">
      <span className="tiptap-loading-dots" aria-hidden="true"><i/><i/><i/></span>
      <strong>กำลังเปิดเครื่องมือเขียน</strong>
      <small>เตรียมเนื้อหาและเครื่องมือจัดรูปแบบ...</small>
    </div>
  </div>;
}
