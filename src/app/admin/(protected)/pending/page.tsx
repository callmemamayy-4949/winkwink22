import { getAdminReviews } from "@/lib/data/reviews";
import { PendingList } from "@/components/admin/PendingList";

// Always live — the pending queue must never be served from a stale static cache.
export const dynamic = "force-dynamic";

export default async function AdminPendingPage() {
  const reviews = await getAdminReviews({ status: "pending" });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-primary">รอตรวจสอบ</h1>
        <p className="mt-1 text-sm text-label">
          {reviews.length} รายการรอดำเนินการ · แก้ไขข้อมูลแล้ว Approve / ซ่อน / มาร์คซ้ำ
        </p>
      </div>

      <PendingList initialReviews={reviews} />
    </div>
  );
}
