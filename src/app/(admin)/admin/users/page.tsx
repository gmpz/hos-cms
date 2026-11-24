import { UsersManager } from "@/features/users/components/users-manager";
import { NativeSelect } from "@/components/ui/native-select";
import { getUserProfileOptions, listUsers } from "@/server/auth/users";
import { currentUser } from "@/server/auth/session";
import { Suspense } from "react";
import { connection } from "next/server";
import { Plus, Search } from "lucide-react";
import { AdminTableLoadingRows } from "@/components/admin/admin-content-loading";

export default function UsersPage() {
  return <Suspense fallback={<UsersTableLoading/>}><UsersContent/></Suspense>;
}

function UsersTableLoading() {
  return <main className="users-manager users-table-page">
    <header><div><h1>บัญชีผู้ใช้งาน</h1><p>จัดการบัญชี โปรไฟล์ บทบาท และหน่วยงานของบุคลากร</p></div><button type="button" className="primary-button users-add-button" disabled><Plus size={17}/>เพิ่มผู้ใช้งาน</button></header>
    <section className="users-table-card admin-data-table" aria-busy="true">
      <div className="users-table-toolbar"><div className="users-search"><Search size={17}/><input type="search" placeholder="ค้นหาชื่อ ชื่อผู้ใช้ หรืออีเมล" disabled/></div><NativeSelect defaultValue="ALL" disabled><option value="ALL">ทุกสถานะ</option><option value="ACTIVE">ใช้งาน</option><option value="DISABLED">ปิดใช้งาน</option></NativeSelect></div>
      <div className="users-table-scroll admin-data-table-scroll"><table className="users-table"><thead><tr><th>ผู้ใช้งาน</th><th>ข้อมูลบุคลากร</th><th>บทบาท</th><th>สถานะ</th><th title="การยืนยันตัวตนสองขั้นตอน">2FA</th><th>เข้าสู่ระบบล่าสุด</th><th className="admin-table-actions-heading">จัดการ</th></tr></thead><tbody><AdminTableLoadingRows kind="users"/></tbody></table></div>
    </section>
  </main>;
}

async function UsersContent() {
  await connection();
  const [users, user, profileOptions] = await Promise.all([listUsers(), currentUser(), getUserProfileOptions()]);
  // This dynamic Server Component supplies one request-time clock for hydration.
  // eslint-disable-next-line react-hooks/purity
  return <UsersManager users={users} currentUserId={user?.id ?? ""} profileOptions={profileOptions} serverNow={Date.now()}/>;
}
