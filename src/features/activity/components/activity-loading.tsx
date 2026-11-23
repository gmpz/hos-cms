import { AdminTableLoadingRows } from "@/components/admin/admin-content-loading";
import { ActivityTableHead } from "./activity-manager";

export function ActivityLoading() {
  return <section className="activity-table admin-data-table" aria-busy="true">
      <div className="admin-list-table-scroll admin-data-table-scroll" tabIndex={0} role="region" aria-label="ตารางบันทึกกิจกรรม เลื่อนซ้ายขวาได้">
        <table><ActivityTableHead/><tbody><AdminTableLoadingRows kind="activity" rows={5}/></tbody></table>
      </div>
  </section>;
}
