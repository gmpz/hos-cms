import { PublicDocumentsSkeleton } from "@/features/documents/components/public-documents-list";

export default function Loading() {
  return <PublicDocumentsSkeleton count={20} />;
}
