import Link from "next/link";
import { getAdminReviews } from "@/lib/data/reviews";
import { STATUS_LABELS_TH, type PostStatus, type ReviewWithMedia } from "@/types/review";

// Always live — admin stats must never be served from a stale static cache.
export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<PostStatus, string> = {
  approved: "bg-pastel-mint text-pastel-mint-text",
  pending:  "bg-pastel-yellow text-pastel-yellow-text",
  hidden:   "bg-surface-container text-label",
  duplicate:"bg-pastel-purple text-pastel-purple-text",
};

function StatusBreakdown({ reviews }: { reviews: ReviewWithMedia[] }) {
  const statuses: PostStatus[] = ["approved", "pending", "hidden", "duplicate"];
  return (
    <ul className="space-y-2">
      {statuses.map((s) => {
        const count = reviews.filter((r) => r.status === s).length;
        return (
          <li key={s} className="flex items-center justify-between">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[s]}`}>
              {STATUS_LABELS_TH[s]}
            </span>
            <span className="text-sm font-semibold text-text-strong">{count}</span>
          </li>
        );
      })}
    </ul>
  );
}

export default async function AdminDashboard() {
  const reviews   = await getAdminReviews({});
  const total     = reviews.length;
  const approved  = reviews.filter((r) => r.status === "approved").length;
  const pending   = reviews.filter((r) => r.status === "pending").length;

  const STAT_CARDS = [
    { label: "รีวิวทั้งหมด",   value: total,    color: "bg-primary-container text-primary", href: "/admin/reviews" },
    { label: "อนุมัติแล้ว",   value: approved, color: "bg-pastel-mint text-pastel-mint-text", href: "/admin/reviews?status=approved" },
    { label: "รอตรวจสอบ",      value: pending,  color: "bg-pastel-yellow text-pastel-yellow-text", href: "/admin/pending" },
  ];

  const QUICK_LINKS = [
    { href: "/admin/pending",    icon: "⏳", label: "ตรวจรีวิวรอดำเนินการ",   desc: "อนุมัติ ซ่อน หรือมาร์คซ้ำ" },
    { href: "/admin/import",     icon: "📥", label: "นำเข้าไฟล์รีวิว",          desc: "อัปโหลด CSV/JSON แล้วส่งเข้าคิวตรวจ" },
    { href: "/admin/manual-add", icon: "➕", label: "เพิ่มรีวิวด้วยตัวเอง",     desc: "วางลิงก์ X หรือ TikTok แล้วกรอกข้อมูล" },
    { href: "/admin/scrape",     icon: "📘", label: "วิธีใช้ Winkwink Admin",    desc: "ลำดับการเพิ่ม ตรวจ และเผยแพร่รีวิว" },
    { href: "/reviews",          icon: "👁️", label: "ดูหน้า Public Gallery",     desc: "ดูเว็บในมุมมองลูกค้า" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-primary">ภาพรวม</h1>
        <p className="mt-1 text-sm text-label">Phase 2 — เชื่อมต่อ Supabase แล้ว</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {STAT_CARDS.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="group flex items-center gap-4 rounded-card bg-white p-5 shadow-card transition-shadow hover:shadow-card-hover"
          >
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl font-extrabold ${card.color}`}>
              {card.value}
            </div>
            <div>
              <p className="text-xs text-label">{card.label}</p>
              <p className="text-lg font-bold text-text-strong group-hover:text-primary">
                {card.value} รายการ
              </p>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Status breakdown */}
        <div className="rounded-card bg-white p-5 shadow-card">
          <h2 className="mb-4 text-base font-bold text-text-strong">แยกตาม Status</h2>
          <StatusBreakdown reviews={reviews} />
        </div>

        {/* Quick links */}
        <div className="rounded-card bg-white p-5 shadow-card">
          <h2 className="mb-4 text-base font-bold text-text-strong">ทางลัด</h2>
          <ul className="space-y-2">
            {QUICK_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="flex items-center gap-3 rounded-control p-3 text-sm transition-colors hover:bg-surface-container-low"
                >
                  <span className="text-xl">{link.icon}</span>
                  <div>
                    <p className="font-semibold text-text-strong">{link.label}</p>
                    <p className="text-xs text-label">{link.desc}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

    </div>
  );
}
