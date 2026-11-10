import { AdminListLoadingRows } from "@/components/admin/admin-content-loading";

export function ActivityLoading() {
  return <div aria-busy="true">
      <div className="activity-list activity-loading-list" role="rowgroup">
        <AdminListLoadingRows columns={5} rows={5} rowClassName="activity-loading-row"/>
      </div>
  </div>;
}
