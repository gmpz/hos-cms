import { UnitEditor } from "@/features/units/components/unit-editor";
export const instant = false;
export default async function EditUnitPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <UnitEditor unitId={id}/>; }
