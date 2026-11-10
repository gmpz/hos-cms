import { Search } from "lucide-react";
import { NativeSelect } from "@/components/ui/native-select";
import { ActivityLoading } from "./activity-loading";

export function ActivityPendingCard() {
  return <section className="activity-card" aria-label="รายการบันทึกกิจกรรม" aria-busy="true">
    <div className="activity-card-toolbar">
      <div><h2>รายการกิจกรรม</h2><p>กำลังโหลดข้อมูล...</p></div>
      <div className="activity-toolbar" role="search" aria-label="ค้นหาและกรองกิจกรรม">
        <label className="activity-search"><Search size={17}/><input type="search" aria-label="ค้นหากิจกรรม" placeholder="ค้นหากิจกรรมหรือผู้ดำเนินการ..." disabled/></label>
        <label className="activity-type-filter"><NativeSelect aria-label="กรองประเภทกิจกรรม" disabled><option>ทุกประเภท</option></NativeSelect></label>
        <label className="activity-date-period"><NativeSelect aria-label="ช่วงเวลากิจกรรม" disabled><option>วันนี้</option></NativeSelect></label>
      </div>
    </div>
    <div className="activity-list-header" role="row"><span>กิจกรรม</span><span>รายละเอียด</span><span>ผู้ดำเนินการ</span><span>วันและเวลา</span><span>จัดการ</span></div>
    <ActivityLoading/>
  </section>;
}
