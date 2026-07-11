import Link from "next/link";

const STEPS = [
  {
    title: "1. เพิ่มรีวิวจากลิงก์",
    body: "ใช้เมื่อต้องการเพิ่มโพสต์ X หรือ TikTok ทีละรายการ ระบบจะดึงข้อความ รูปพรีวิว วันที่ ยอดเข้าชม และข้อมูลที่หาได้จากลิงก์จริง แล้วบันทึกเป็นรายการรอตรวจ",
    href: "/admin/manual-add",
    cta: "ไปหน้าเพิ่มรีวิว",
  },
  {
    title: "2. นำเข้าไฟล์ CSV",
    body: "ใช้เมื่อต้องเพิ่มหลายรายการพร้อมกัน ใส่ original_url เป็นลิงก์หลัก และใช้ caption เป็นคำใบ้รุ่นมือถือหรือเลนส์เท่านั้น ข้อมูลทุกแถวจะถูกส่งเข้าคิวตรวจ",
    href: "/admin/import",
    cta: "ไปหน้านำเข้าไฟล์",
  },
  {
    title: "3. ตรวจรายการรอดำเนินการ",
    body: "ตรวจรูปพรีวิว รุ่นมือถือ เลนส์ ปี ยอดเข้าชม และ model hint จากไฟล์ก่อนเผยแพร่ แก้ข้อมูลให้ครบแล้วค่อยอนุมัติ",
    href: "/admin/pending",
    cta: "ไปหน้ารอตรวจสอบ",
  },
  {
    title: "4. จัดการรีวิวที่เผยแพร่แล้ว",
    body: "ดูรายการทั้งหมด แก้สถานะ ซ่อนรายการที่ไม่ต้องการ หรือเช็กข้อมูลซ้ำก่อนให้ลูกค้าเห็นบนหน้ารีวิว",
    href: "/admin/reviews",
    cta: "ไปหน้ารีวิวทั้งหมด",
  },
] as const;

export default function WinkwinkAdminGuidePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-primary">Winkwink Admin</h1>
        <p className="mt-1 text-sm text-label">
          วิธีใช้หลังบ้านสำหรับเพิ่ม ตรวจ และเผยแพร่รีวิวให้พร้อมก่อนขึ้นหน้าเว็บจริง
        </p>
      </div>

      <div className="rounded-card border border-primary/15 bg-primary-container/60 p-5 text-sm text-primary">
        <p className="font-bold">หลักการทำงานสั้น ๆ</p>
        <p className="mt-2 text-xs leading-6">
          รีวิวที่เพิ่มจากลิงก์หรือไฟล์จะเข้าเป็น <code>status = pending</code> ก่อนเสมอ
          ลูกค้าจะยังไม่เห็นรายการนั้น จนกว่าแอดมินจะตรวจข้อมูลและกดอนุมัติในหน้า
          {" "}
          <Link href="/admin/pending" className="font-semibold underline underline-offset-2">
            รอตรวจสอบ
          </Link>
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {STEPS.map((step) => (
          <section key={step.href} className="rounded-card bg-white p-5 shadow-card">
            <h2 className="text-sm font-bold text-text-strong">{step.title}</h2>
            <p className="mt-2 min-h-20 text-xs leading-6 text-label">{step.body}</p>
            <Link
              href={step.href}
              className="mt-4 inline-flex rounded-full bg-primary px-4 py-2 text-xs font-semibold text-on-primary transition-transform hover:scale-[1.01] active:scale-95"
            >
              {step.cta}
            </Link>
          </section>
        ))}
      </div>

      <section className="rounded-card bg-white p-5 shadow-card">
        <h2 className="text-sm font-bold text-text-strong">รูปแบบ CSV ที่แนะนำ</h2>
        <p className="mt-2 text-xs leading-6 text-label">
          ถ้าโพสต์จริงไม่มีชื่อรุ่น ให้ใส่ชื่อรุ่นไว้ใน <code>caption</code> เพื่อช่วยระบบจับรุ่นมือถือ
          โดย <code>original_url</code> ยังเป็นแหล่งข้อมูลหลักของโพสต์
        </p>
        <pre className="mt-3 overflow-x-auto rounded-control bg-surface-cream p-3 text-xs text-text">
{`caption,original_url
Vivo X300 Pro + Lens 200mm,https://x.com/user/status/123`}
        </pre>
      </section>

      <section className="rounded-card border border-pastel-yellow-text/20 bg-pastel-yellow p-5 text-sm text-pastel-yellow-text">
        <h2 className="text-sm font-bold">ข้อควรจำก่อนอนุมัติ</h2>
        <ul className="mt-2 space-y-1 text-xs leading-6">
          <li>• ตรวจว่ารูปพรีวิวแสดงถูกโพสต์</li>
          <li>• เช็กว่ารุ่นมือถือเลือกจาก master list เท่านั้น</li>
          <li>• caption จากไฟล์คือ model hint ไม่ใช่ข้อความโพสต์จริง</li>
          <li>• ถ้าข้อมูลไม่ครบ ให้เก็บไว้รอตรวจหรือซ่อนไว้ก่อน</li>
        </ul>
      </section>
    </div>
  );
}
