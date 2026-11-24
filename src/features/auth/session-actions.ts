"use server";

import { currentUser, revokeOtherSessions } from "@/server/auth/session";

export async function revokeOwnOtherSessionsAction(): Promise<{ ok: boolean; message: string }> {
  const user = await currentUser();
  if (!user || user.mustChangePassword) return { ok: false, message: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" };
  try {
    const count = await revokeOtherSessions(user.id);
    if (count === null) return { ok: false, message: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" };
    return { ok: true, message: count ? `ออกจากระบบบนอุปกรณ์อื่น ${count} เซสชันแล้ว` : "ไม่มีเซสชันอื่นที่ต้องออกจากระบบ" };
  } catch {
    return { ok: false, message: "ออกจากอุปกรณ์อื่นไม่สำเร็จ กรุณาลองใหม่" };
  }
}
