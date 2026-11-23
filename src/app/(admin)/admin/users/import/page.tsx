import { currentUser } from "@/server/auth/session";
import { redirect } from "next/navigation";
import { UsersImport } from "@/features/users/components/users-import";

export default async function UsersImportPage() {
  const user = await currentUser();
  if (user?.role !== "ADMIN" || user.mustChangePassword) redirect("/admin/users");
  return <UsersImport/>;
}
