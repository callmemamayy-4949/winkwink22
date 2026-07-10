import { getAdminReviews } from "@/lib/data/reviews";
import { AdminReviewsTable } from "@/components/admin/AdminReviewsTable";

// Always live — admin lists must never be served from a stale static cache.
export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  const reviews = await getAdminReviews({});

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-primary">รีวิวทั้งหมด</h1>
        <p className="mt-1 text-sm text-label">ดู แก้ไข และเปลี่ยน status รีวิวทุกรายการ</p>
      </div>

      <AdminReviewsTable initialReviews={reviews} />
    </div>
  );
}
