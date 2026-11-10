import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const basics = {
  POSTS: ["ข่าวประชาสัมพันธ์", "กิจกรรม", "ประกาศ", "รับสมัครงาน", "ผลงานกลุ่มงาน"],
  DOCUMENTS: ["แบบฟอร์มบริการ", "รายงานประจำปี", "คู่มือประชาชน", "ประกาศโรงพยาบาล", "เอกสารทั่วไป"],
};

try {
  const created = await prisma.$transaction(async (tx) => {
    let count = 0;
    for (const [scope, names] of Object.entries(basics)) {
      const existing = await tx.category.findMany({
        where: { scope },
        select: { name: true, sortOrder: true },
      });
      const existingNames = new Set(existing.map((item) => item.name));
      let nextOrder = Math.max(-1, ...existing.map((item) => item.sortOrder)) + 1;
      for (const name of names) {
        if (existingNames.has(name)) continue;
        await tx.category.create({
          data: { id: randomUUID(), scope, name, sortOrder: nextOrder++ },
        });
        count++;
      }
    }
    return count;
  });
  process.stdout.write(`Added ${created} basic categories.\n`);
} finally {
  await prisma.$disconnect();
}
