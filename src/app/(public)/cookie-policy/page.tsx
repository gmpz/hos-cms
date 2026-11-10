import type { Metadata } from "next";

export const metadata: Metadata = { title: "นโยบายคุกกี้ | โรงพยาบาลคลองหลวง" };

export default function CookiePolicyPage() {
  return (
    <article className="public-policy-page">
      <header>
        <p className="public-policy-eyebrow">ข้อมูลและนโยบายเว็บไซต์</p>
        <h1>นโยบายคุกกี้</h1>
        <p>คุกกี้คือข้อมูลขนาดเล็กที่เว็บไซต์บันทึกไว้ในเบราว์เซอร์ เว็บไซต์ใช้คุกกี้เพื่อการเข้าสู่ระบบและนับจำนวนครั้งที่มีการเข้าชม</p>
      </header>
      <section>
        <h2>คุกกี้ที่จำเป็นต่อการเข้าสู่ระบบ</h2>
        <div className="public-policy-table-wrap">
          <table>
            <thead><tr><th>ชื่อ</th><th>วัตถุประสงค์</th><th>ระยะเวลา</th></tr></thead>
            <tbody><tr><td><code>hos_cms_session</code></td><td>จดจำเซสชันเพื่อยืนยันตัวตนและตรวจสอบสิทธิ์การเข้าถึงหน้าที่ต้องเข้าสู่ระบบ</td><td>ไม่เกิน 7 วัน หรือลบเมื่อออกจากระบบ</td></tr></tbody>
          </table>
        </div>
        <p>คุกกี้นี้ถูกตั้งค่าเป็น <code>HttpOnly</code> และ <code>SameSite=Lax</code> เพื่อช่วยลดความเสี่ยงด้านความปลอดภัย หากปิดกั้นคุกกี้นี้ การเข้าสู่ระบบอาจใช้งานไม่ได้</p>
      </section>
      <section>
        <h2>คุกกี้สำหรับนับการเข้าชม</h2>
        <div className="public-policy-table-wrap">
          <table>
            <thead><tr><th>ชื่อ</th><th>วัตถุประสงค์</th><th>ระยะเวลา</th></tr></thead>
            <tbody><tr><td><code>hos_site_visit</code></td><td>จดจำรอบการเข้าชม เพื่อไม่ให้นับการรีเฟรชหรือเปิดหน้าซ้ำเป็นครั้งใหม่</td><td>30 นาทีหลังการใช้งานหน้าเว็บสาธารณะครั้งล่าสุด</td></tr></tbody>
          </table>
        </div>
        <p>คุกกี้นี้ตั้งค่าเป็น <code>HttpOnly</code> และ <code>SameSite=Lax</code> ใช้กับการนับสถิติภายในเว็บไซต์ ไม่ได้ใช้ติดตามข้ามเว็บไซต์</p>
      </section>
      <section>
        <h2>บริการจากภายนอก</h2>
        <p>บางหน้าอาจมีเนื้อหาที่ฝังจากบริการภายนอก เช่น Google Maps หรือวิดีโอ เมื่อเปิดหน้าที่มีเนื้อหาดังกล่าว ผู้ให้บริการภายนอกอาจได้รับข้อมูลการเชื่อมต่อและใช้คุกกี้ตามนโยบายของตนเอง ส่วนปุ่ม “ดูแผนที่ Google Maps” ใน footer จะนำไปยังเว็บไซต์ Google Maps เมื่อท่านคลิก</p>
      </section>
      <section>
        <h2>การจัดการคุกกี้</h2>
        <p>ท่านสามารถลบหรือปิดกั้นคุกกี้ผ่านการตั้งค่าเบราว์เซอร์ได้ แต่ฟังก์ชันที่ต้องเข้าสู่ระบบอาจไม่ทำงาน หากมีข้อสงสัย กรุณาติดต่อโรงพยาบาลตามช่องทางติดต่อด้านล่างของหน้านี้</p>
      </section>
    </article>
  );
}
