"use client";

import { useEffect, useState } from "react";
import { ActionToast } from "@/components/admin/action-toast";

export function ProfileToast({ status }: { status: "saved" | "invalid" | "invalid-name" | "invalid-profile" | "invalid-photo" | null }) {
  const [visible, setVisible] = useState(status !== null);

  useEffect(() => {
    if (!status) return;
    window.history.replaceState(null, "", "/profile");
  }, [status]);

  if (!status || !visible) return null;
  const success = status === "saved";
  const description = success ? "อัปเดตข้อมูลและรูปโปรไฟล์เรียบร้อย" : status === "invalid-profile" ? "ประเภทบุคลากร ตำแหน่ง หรือระดับไม่ถูกต้อง กรุณาโหลดหน้าใหม่" : status === "invalid-name" ? "ชื่อ-นามสกุลต้องมีความยาว 2–160 ตัวอักษร" : status === "invalid-photo" ? "รองรับรูป JPG, PNG หรือ WebP ขนาดไม่เกิน 5 MB" : "หมายเลขโทรศัพท์หรืออีเมลไม่ถูกต้อง";
  return <ActionToast ok={success} title={success ? "บันทึกโปรไฟล์แล้ว" : "บันทึกไม่สำเร็จ"} description={description} onClose={() => setVisible(false)}/>;
}
