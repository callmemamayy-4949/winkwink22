This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Phase 2 setup — connect Supabase

1. Create a project at [supabase.com](https://supabase.com) and run [`src/supabase-schema.sql`](src/supabase-schema.sql) in the SQL editor to create the `posts`, `post_media`, and `scrape_jobs` tables.
2. Copy `.env.example` to `.env.local`.
3. On the Supabase dashboard, go to **Project Settings → API** and fill in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL` — Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — `anon` `public` key
   - `SUPABASE_SERVICE_ROLE_KEY` — `service_role` key. **Never** commit this or prefix it with `NEXT_PUBLIC_` — it bypasses Row Level Security and is only ever read on the server (admin data layer and server actions).
4. `npm run dev` — the public gallery and admin panel now read/write real data.

## วิธีเก็บรีวิวจากลิงก์ (แนะนำ) — `links:csv`

> X ปิดกั้นการล็อกอินจากเบราว์เซอร์อัตโนมัติ (anti-bot) เราจึง**ไม่**หลบระบบนั้น
> วิธีนี้ใช้ **oEmbed API ทางการของ X/TikTok** แปลงลิงก์เป็นข้อมูล — ไม่ต้องล็อกอิน
> ไม่ใช่ automation ไม่โดนบล็อก และได้ไฟล์เก็บไว้ในเครื่องเป็นหลังบ้าน

1. ก๊อป `links.txt.example` เป็น `links.txt` แล้ววางลิงก์โพสต์ (บรรทัดละ 1 อัน)

   ```powershell
   Copy-Item links.txt.example links.txt
   notepad links.txt
   ```

2. รันคำสั่ง — ระบบยิง oEmbed ทีละลิงก์ แยกยี่ห้อ/รุ่น/เลนส์/คุณภาพให้อัตโนมัติ

   ```bash
   npm run links:csv
   # หรือวางลิงก์ตรง ๆ:  npm run links:csv -- https://x.com/user/status/123
   ```

3. ได้ไฟล์ `exports/x-reviews-YYYY-MM-DD.csv` (+ `.json`) — นี่คือหลังบ้านเก็บในเครื่อง

4. อัปโหลดไฟล์นั้นที่ `/admin/import` → ทุกรายการเข้าเป็น `pending`

5. ตรวจ + แก้ไข + Approve ที่ `/admin/pending` → ขึ้นหน้า public

> ลิงก์ที่ดึงข้อความไม่ได้จะยังถูกเก็บไว้ (ใช้ลิงก์ + media_url ได้) แล้วมาเติมข้อความเองทีหลังได้

## วิธี scrape รีวิวจาก X แบบ local (สำรอง — มักโดน X บล็อก)

> ⚠️ ปัจจุบัน X บล็อกการล็อกอินจากเบราว์เซอร์อัตโนมัติเป็นส่วนใหญ่ ถ้ารันแล้วล็อกอินไม่ผ่าน
> ให้ใช้วิธี `links:csv` ด้านบนแทน วิธี scrape นี้เก็บไว้เผื่อกรณีที่ยังใช้ได้เท่านั้น

Scraping runs as a Playwright script on your own machine — never on Vercel, and there is no button on the website that triggers it. This keeps X login/rate-limit protections intact and stops the public site from ever scraping on its own.

1. **ติดตั้ง dependencies** (ครั้งแรกเท่านั้น)

   ```bash
   npm install
   ```

2. **ติดตั้ง browser ของ Playwright** (ครั้งแรกเท่านั้น)

   ```bash
   npm run scrape:x:install
   ```

3. **รันคำสั่ง scrape** พร้อม keyword และจำนวนโพสต์สูงสุด

   ```bash
   npm run scrape:x -- --keyword "#รีวิววิ้งวิ้ง30" --limit 30
   ```

   หน้าต่างเบราว์เซอร์จะเปิดขึ้น (โปรไฟล์ถาวรที่ `.x-profile/`) ครั้งแรก X จะให้ล็อกอินก่อน — สคริปต์จะ**รอ**ให้คุณล็อกอินเองด้วยบัญชีจริง (สูงสุด 3 นาที) แล้วดึงข้อมูลต่อให้อัตโนมัติ ครั้งต่อ ๆ ไปจะจำ session ไว้ ไม่ต้องล็อกอินซ้ำ

   สคริปต์ไม่กรอกรหัสผ่าน ไม่แตะ CAPTCHA และไม่ข้ามระบบป้องกันใด ๆ ให้เอง — แค่รอให้คุณล็อกอิน ถ้าหมดเวลารอหรือรันแบบ `--headless` (ไม่มีหน้าต่าง) จะหยุดพร้อม error `ไม่สามารถดึงข้อมูลจาก X ได้ ...`

   Keyword ที่ใช้ได้: `#รีวิวเช่าwinkwink`, `#รีวิววิ้งวิ้ง30`, `@winkwink_rent`

   > โฟลเดอร์ `.x-profile/` เก็บ cookie/session จริงของคุณ — ถูก gitignore ไว้แล้ว ห้าม commit เด็ดขาด

4. **ดูไฟล์ใน `exports/`** — ได้ทั้ง JSON และ CSV:

   ```
   exports/x-reviews-YYYY-MM-DD.json
   exports/x-reviews-YYYY-MM-DD.csv
   ```

5. **เข้าเว็บ `/admin/import`**

6. **อัปโหลดไฟล์ JSON หรือ CSV** ไฟล์ใดไฟล์หนึ่ง — ระบบตรวจ `original_url` ซ้ำกับข้อมูลเดิมอัตโนมัติ และทุกรายการที่นำเข้าใหม่จะถูกบันทึกเป็น `status = pending` เสมอ (ไม่ขึ้นหน้าเว็บทันที)

7. **ไปตรวจที่ `/admin/pending`** — แก้ไขข้อมูล (แบรนด์, รุ่น, เลนส์, สถานที่ ฯลฯ) ตามต้องการ

8. **กด Approve** เพื่อให้รีวิวขึ้นหน้า `/reviews` จริง — หน้า public จะแสดงเฉพาะรีวิวที่ approved เท่านั้น

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
