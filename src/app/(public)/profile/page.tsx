import { Building2, UserRound } from "lucide-react";
import { redirect } from "next/navigation";
import { changePasswordPath } from "@/features/auth/return-to";
import { ProfileEditor } from "@/features/users/components/profile-editor";
import { ProfileToast } from "@/features/users/components/profile-toast";
import { personnelPhotoPositionStyle } from "@/features/units/components/personnel-photo-position";
import { currentUser } from "@/server/auth/session";
import { prisma } from "@/server/database/prisma";
import { mediaPublicUrl } from "@/server/media/storage";

export const instant = false;

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const sessionUser = await currentUser();
  if (!sessionUser) redirect("/login?returnTo=%2Fprofile");
  if (sessionUser.mustChangePassword) redirect(changePasswordPath("/profile"));
  const [user, masters, query] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: sessionUser.id }, select: {
      username: true, displayName: true, phone: true, phoneExtension: true, email: true, publishPhone: true, publishEmail: true,
      personTypeId: true, positionId: true, levelId: true, profilePhotoFocusX: true, profilePhotoFocusY: true, profilePhotoZoom: true,
      profileMedia: { select: { fileName: true } },
      personType: { select: { name: true } }, position: { select: { name: true } }, level: { select: { name: true } },
      memberships: { select: { isPrimary: true, unit: { select: { name: true } } }, orderBy: { isPrimary: "desc" } },
    } }),
    prisma.profileMaster.findMany({ where: { active: true }, select: { id: true, kind: true, name: true }, orderBy: [{ kind: "asc" }, { sortOrder: "asc" }, { name: "asc" }] }),
    searchParams,
  ]);
  const photoUrl = user.profileMedia ? mediaPublicUrl(user.profileMedia.fileName) : null;
  const focus = { x: user.profilePhotoFocusX, y: user.profilePhotoFocusY };
  const editorKey = JSON.stringify([
    user.displayName, user.phone, user.phoneExtension, user.email, user.publishPhone, user.publishEmail,
    user.personTypeId, user.positionId, user.levelId, photoUrl, focus.x, focus.y, user.profilePhotoZoom,
  ]);
  const options = (kind: "PERSON_TYPE" | "POSITION" | "LEVEL") => masters.filter((master) => master.kind === kind);
  const toastStatus = query.saved === "1" ? "saved" : query.error === "profile" ? "invalid-profile" : query.error === "name" ? "invalid-name" : query.error === "photo" ? "invalid-photo" : query.error === "invalid" ? "invalid" : null;
  return <section className="profile-page">
    <ProfileToast key={toastStatus ?? "idle"} status={toastStatus}/>
    <header><h1>โปรไฟล์ของฉัน</h1><p>จัดการข้อมูลบุคลากร รูปโปรไฟล์ และข้อมูลติดต่อ</p></header>
    <div className="profile-grid">
      <aside className="profile-summary-card">
        <div className="profile-summary-identity"><span className="profile-summary-photo" style={photoUrl ? { backgroundImage: `url(${photoUrl})`, ...personnelPhotoPositionStyle(focus, user.profilePhotoZoom) } : undefined}>{photoUrl ? null : <UserRound size={48}/>}</span><div><h2>{user.displayName}</h2><p>@{user.username}</p></div></div>
        <dl className="profile-summary-details"><div><dt>ประเภทบุคลากร</dt><dd>{user.personType?.name ?? "ไม่ระบุ"}</dd></div><div><dt>ตำแหน่ง</dt><dd>{user.position?.name ?? "ไม่ระบุ"}</dd></div><div><dt>ระดับ</dt><dd>{user.level?.name ?? "ไม่ระบุ"}</dd></div></dl>
        <section className="profile-unit-summary"><h3><Building2 size={17}/>หน่วยงานที่สังกัด</h3>{user.memberships.length ? <ul>{user.memberships.map((membership) => <li key={membership.unit.name}>{membership.unit.name}{membership.isPrimary ? <em>หน่วยงานหลัก</em> : null}</li>)}</ul> : <p>ยังไม่ได้กำหนดหน่วยงาน</p>}<small>ข้อมูลหน่วยงานกำหนดโดยผู้ดูแลระบบ</small></section>
      </aside>
      <ProfileEditor key={editorKey} displayName={user.displayName} phone={user.phone} phoneExtension={user.phoneExtension} email={user.email} publishPhone={user.publishPhone} publishEmail={user.publishEmail} personTypeId={user.personTypeId} positionId={user.positionId} levelId={user.levelId} personTypes={options("PERSON_TYPE")} positions={options("POSITION")} levels={options("LEVEL")} initialPhotoUrl={photoUrl} initialPhotoFocus={focus} initialPhotoZoom={user.profilePhotoZoom}/>
    </div>
  </section>;
}
