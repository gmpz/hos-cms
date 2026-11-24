import "server-only";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { hosCmsPrisma?: PrismaClient };

function createClient() {
  const url = process.env.DATABASE_URL ?? "mysql://unused:unused@127.0.0.1:3306/hos_cms";
  return new PrismaClient({ datasourceUrl: url });
}

// Prisma's generated model delegates can change while next dev is running.
// Replace the cached client after a schema regeneration instead of retaining
// an instance created from the previous generated schema.
export const prisma = globalForPrisma.hosCmsPrisma?.userTotp
  ? globalForPrisma.hosCmsPrisma
  : createClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.hosCmsPrisma = prisma;
