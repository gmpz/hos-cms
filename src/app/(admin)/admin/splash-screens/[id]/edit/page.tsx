import { notFound } from "next/navigation";
import { SplashScreenEditor } from "@/features/splash-screens/components/splash-screen-editor";
import { getSplashScreen } from "@/server/splash-screens/repository";

export const instant = false;

export default async function EditSplashScreenPage({ params }: { params: Promise<{ id: string }> }) {
  const item = await getSplashScreen((await params).id);
  if (!item) notFound();
  return <SplashScreenEditor key={`${item.id}:${item.revision}`} item={item}/>;
}
