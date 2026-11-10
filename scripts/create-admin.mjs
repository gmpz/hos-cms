import { randomBytes, randomUUID, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
import { PrismaClient } from "@prisma/client";
import { isValidPassword } from "../src/features/auth/password-policy.mjs";

const [, , username, password, displayName = "ผู้ดูแลระบบ"] = process.argv;
if (!process.env.DATABASE_URL) throw new Error("กรุณากำหนด DATABASE_URL ในไฟล์ .env");
if (!username || !password || !isValidPassword(password))
  throw new Error("วิธีใช้: npm run user:create-admin -- admin รหัสผ่านอย่างน้อย 10 ตัว มีพิมพ์ใหญ่ พิมพ์เล็ก ตัวเลข และสัญลักษณ์ [ชื่อแสดง]");

const scrypt = promisify(scryptCallback);
async function hashPassword(value) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(value, salt, 64);
  return `scrypt:${salt}:${Buffer.from(derived).toString("hex")}`;
}

const normalizedUsername = username.trim().toLowerCase();
const prisma = new PrismaClient();
const passwordHash = await hashPassword(password);
await prisma.user.upsert({
  where: { username: normalizedUsername },
  create: { id: randomUUID(), username: normalizedUsername, displayName, passwordHash, role: "ADMIN", status: "ACTIVE", mustChangePassword: false },
  update: { displayName, passwordHash, role: "ADMIN", status: "ACTIVE", mustChangePassword: false },
});
await prisma.$disconnect();
console.log(`สร้าง/อัปเดตผู้ดูแล ${normalizedUsername} เรียบร้อยแล้ว`);
