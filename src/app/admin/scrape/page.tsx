import Link from "next/link";

/**
 * This page is documentation only — there is no button here that scrapes
 * anything. Scraping runs as a local Playwright script on an admin's own
 * machine (scripts/scrape-x.ts), never on Vercel and never triggered from
 * the website, so it can't be abused as a public endpoint and never bypasses
 * X's login/CAPTCHA/rate-limit protections. The script exports JSON/CSV,
 * which an admin uploads at /admin/import.
 */
const KEYWORDS = ["#รีวิวเช่าwinkwink", "#รีวิววิ้งวิ้ง30", "@winkwink_rent"] as const;

export default function ScrapePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-primary">Scrape รีวิวจาก X</h1>
        <p className="mt-1 text-sm text-label">
          รันบนเครื่อง local เท่านั้น — เว็บนี้ไม่มีปุ่ม scrape เพราะ Playwright รันบน Vercel ไม่ได้และไม่ควรทำ
        </p>
      </div>

      <div className="rounded-card border border-pastel-yellow-text/20 bg-pastel-yellow p-4 text-sm text-pastel-yellow-text">
        <p className="font-semibold">⚠️ X มักบล็อกการล็อกอินอัตโนมัติ — แนะนำวิธีนี้แทน</p>
        <p className="mt-2 text-xs">
          ปัจจุบัน X ปิดกั้นเบราว์เซอร์อัตโนมัติ (anti-bot) ทำให้ scraper ล็อกอินไม่ผ่านบ่อย
          เราไม่หลบระบบนั้น ให้ใช้วิธี <strong>รวมลิงก์เป็นไฟล์ CSV</strong> ที่เชื่อถือได้กว่า
          (ใช้ oEmbed API ทางการ ไม่ต้องล็อกอิน):
        </p>
        <pre className="mt-2 overflow-x-auto rounded-control bg-white/60 p-2 text-[11px]">
{`# วางลิงก์ (บรรทัดละ 1 อัน) ใน links.txt แล้ว:
npm run links:csv`}
        </pre>
        <p className="mt-2 text-xs">
          ได้ไฟล์ใน <code>exports/</code> → อัปโหลดที่{" "}
          <a href="/admin/import" className="font-semibold underline">/admin/import</a>
        </p>
      </div>

      <div className="rounded-card border border-pastel-mint-text/20 bg-pastel-mint p-4 text-sm text-pastel-mint-text">
        <p className="font-semibold">🔒 ทำไมต้องรัน local</p>
        <ul className="mt-2 space-y-1 text-xs">
          <li>• Playwright ต้องเปิดเบราว์เซอร์จริง — Vercel serverless รันแบบนี้ไม่ได้</li>
          <li>• ป้องกันไม่ให้เว็บสาธารณะสั่ง scrape เองได้ (ไม่มี API endpoint ให้เรียก)</li>
          <li>• ถ้าเจอ login wall หรือ CAPTCHA สคริปต์จะหยุดทันทีและแจ้ง error ให้ลองใหม่หรือใช้ Manual Add แทน</li>
        </ul>
      </div>

      <div className="rounded-card bg-white p-5 shadow-card">
        <h2 className="mb-4 text-sm font-bold text-text-strong">⚙️ ขั้นตอนการรัน</h2>
        <ol className="space-y-3 text-sm text-text">
          <li>
            <span className="font-semibold text-text-strong">1. ติดตั้งครั้งแรกเท่านั้น</span>
            <pre className="mt-1 overflow-x-auto rounded-control bg-surface-cream p-3 text-xs text-text">
{`npm install
npm run scrape:x:install`}
            </pre>
          </li>
          <li>
            <span className="font-semibold text-text-strong">2. รัน scraper พร้อม keyword และ limit</span>
            <pre className="mt-1 overflow-x-auto rounded-control bg-surface-cream p-3 text-xs text-text">
{`npm run scrape:x -- --keyword "#รีวิววิ้งวิ้ง30" --limit 30`}
            </pre>
          </li>
          <li>
            <span className="font-semibold text-text-strong">3. ล็อกอิน X ในหน้าต่างที่เปิดขึ้น (ครั้งแรกเท่านั้น)</span>
            <p className="mt-1 text-xs text-label">
              ถ้าเจอหน้า login สคริปต์จะ<strong>รอ</strong>ให้คุณล็อกอินเองด้วยบัญชีจริง (สูงสุด 3 นาที)
              แล้วดึงข้อมูลต่อให้อัตโนมัติ — ครั้งต่อไปจะจำ session ไว้ ไม่ต้องล็อกอินซ้ำ
            </p>
          </li>
          <li>
            <span className="font-semibold text-text-strong">4. ได้ไฟล์ในโฟลเดอร์ exports/</span>
            <pre className="mt-1 overflow-x-auto rounded-control bg-surface-cream p-3 text-xs text-text">
{`exports/x-reviews-YYYY-MM-DD.json
exports/x-reviews-YYYY-MM-DD.csv`}
            </pre>
          </li>
          <li>
            <span className="font-semibold text-text-strong">5. อัปโหลดไฟล์ที่ได้</span>
            <p className="mt-1 text-xs text-label">
              ไปที่{" "}
              <Link href="/admin/import" className="font-semibold text-primary underline-offset-2 hover:underline">
                /admin/import
              </Link>{" "}
              แล้วอัปโหลด JSON หรือ CSV ไฟล์ใดไฟล์หนึ่ง ทุกรายการจะเข้าเป็น <code>status = pending</code>
            </p>
          </li>
          <li>
            <span className="font-semibold text-text-strong">6. ตรวจและ Approve</span>
            <p className="mt-1 text-xs text-label">
              ไปที่{" "}
              <Link href="/admin/pending" className="font-semibold text-primary underline-offset-2 hover:underline">
                /admin/pending
              </Link>{" "}
              เพื่อตรวจแก้ไขข้อมูลแล้วกด Approve ก่อนขึ้นหน้าเว็บจริง
            </p>
          </li>
        </ol>
      </div>

      <div className="rounded-card bg-white p-5 shadow-card">
        <h2 className="mb-3 text-sm font-bold text-text-strong">🔍 Keyword ที่ใช้ได้</h2>
        <ul className="flex flex-wrap gap-2">
          {KEYWORDS.map((k) => (
            <li key={k} className="rounded-full bg-surface-container px-3 py-1.5 text-xs font-semibold text-text">
              {k}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-label">
          รันเดือนละครั้ง หรือเมื่อต้องการดึงรีวิวใหม่ — โพสต์ที่เคยนำเข้าแล้ว (ตรวจจาก <code>original_url</code>)
          จะถูกข้ามอัตโนมัติตอน import
        </p>
      </div>
    </div>
  );
}
