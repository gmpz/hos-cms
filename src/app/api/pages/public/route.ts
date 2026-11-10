import { listPublishedCmsPages } from "@/server/pages/repository";

export async function GET() {
  return Response.json(await listPublishedCmsPages(), { headers: { "Cache-Control": "no-store" } });
}
