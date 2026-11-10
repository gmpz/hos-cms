import { ArrowLeft, Home, LockKeyhole } from "lucide-react";
import Link from "next/link";

export function AccessDenied() {
  return <section className="access-denied" role="alert">
    <span className="access-denied-icon"><LockKeyhole size={30}/></span>
    <small>RESTRICTED CONTENT</small>
    <h1>คุณไม่มีสิทธิ์เข้าถึงหน้านี้</h1>
    <p>บัญชีที่กำลังใช้งานไม่ได้อยู่ในรายชื่อผู้ใช้หรือหน่วยงานที่ได้รับอนุญาต</p>
    <div>
      <Link href="/"><Home size={16}/>กลับหน้าแรก</Link>
      <Link href="/profile" className="secondary"><ArrowLeft size={16}/>ดูโปรไฟล์และหน่วยงาน</Link>
    </div>
  </section>;
}
