import { Suspense } from "react";
import { connection } from "next/server";
import ProfileMastersLoading from "./loading";
import { ProfileMastersManager } from "@/features/users/components/profile-masters-manager";
import { listProfileMasters } from "@/server/auth/users";

export default function ProfileMastersPage() {
  return <Suspense fallback={<ProfileMastersLoading />}><ProfileMastersContent /></Suspense>;
}

async function ProfileMastersContent() {
  await connection();
  const masters = await listProfileMasters();
  return <ProfileMastersManager masters={masters.map((item) => ({ ...item, usage: item._count.personTypeUsers + item._count.positionUsers + item._count.levelUsers }))}/>;
}
