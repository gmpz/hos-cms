import { PublicUnitsList } from "@/features/units/components/public-units-list";
import { currentUser } from "@/server/auth/session";
import { listUnits } from "@/server/units/repository";

export const instant = false;

export default async function UnitsPage() {
  const units = await listUnits(false, await currentUser());
  return <PublicUnitsList initialUnits={units}/>;
}
