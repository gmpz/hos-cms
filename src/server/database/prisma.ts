import "server-only";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { hosCmsPrisma?: PrismaClient };

function createClient() {
  const url = process.env.DATABASE_URL ?? "mysql://unused:unused@127.0.0.1:3306/hos_cms";
  return new PrismaClient({ datasourceUrl: url });
}

export const prisma = globalForPrisma.hosCmsPrisma ?? createClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.hosCmsPrisma = prisma;
