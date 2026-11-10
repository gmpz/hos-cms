import { Plus, Search } from "lucide-react";
import { AdminListLoadingRows } from "@/components/admin/admin-content-loading";

export default function ProfileMastersLoading() {
  return <main className="category-manager profile-masters-manager" aria-busy="true">
    <header><h1>ข้อมูลบุคลากร</h1><p>จัดการตัวเลือกประเภทบุคลากร ตำแหน่ง และระดับสำหรับโปรไฟล์ผู้ใช้</p></header>
    <nav aria-label="ประเภทข้อมูลบุคลากร">
      <button type="button" className="active" disabled>ประเภทบุคลากร</button>
      <button type="button" disabled>ตำแหน่ง</button>
      <button type="button" disabled>ระดับ</button>
    </nav>
    <section className="category-manager-card">
      <div className="category-manager-toolbar"><div><h2>ประเภทบุคลากร</h2><p>กำลังโหลดข้อมูล...</p></div><button className="primary-button" type="button" disabled><Plus size={17}/> เพิ่มรายการ</button></div>
      <div className="category-manager-search"><Search size={18}/><input type="search" placeholder="ค้นหาประเภทบุคลากร" disabled/></div>
      <div className="category-manager-table-scroll"><div className="category-manager-table profile-master-table" role="table">
        <div className="category-manager-table-head category-manager-table-row" role="row"><span>ลำดับ</span><span>ชื่อรายการ</span><span>ผู้ใช้งาน</span><span>สถานะ</span><span>จัดการ</span></div>
        <div className="category-manager-list" role="rowgroup"><AdminListLoadingRows columns={5} rowClassName="category-manager-table-row"/></div>
      </div></div>
    </section>
  </main>;
}
