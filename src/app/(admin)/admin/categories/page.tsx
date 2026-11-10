import { CategoryManager } from "@/features/categories/components/category-manager";
import type { CategoryScope } from "@/features/categories/types";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AdminContentLoading } from "@/components/admin/admin-content-loading";

type Props = { searchParams: Promise<{ scope?: string }> };

export default function CategoriesPage({ searchParams }: Props) {
  return <Suspense fallback={<AdminContentLoading/>}>
    <CategoriesContent searchParams={searchParams} />
  </Suspense>;
}

async function CategoriesContent({ searchParams }: Props) {
  const { scope } = await searchParams;
  if (scope !== "posts" && scope !== "documents") redirect("/admin/categories?scope=posts");
  const initialScope: CategoryScope = scope === "documents" ? "documents" : "posts";
  return <CategoryManager key={initialScope} initialScope={initialScope} />;
}
