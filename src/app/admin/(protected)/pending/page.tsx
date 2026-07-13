import { getAdminReviews } from "@/lib/data/reviews";
import { getActivePhoneModelOptions, getFallbackPhoneModelOptions } from "@/lib/data/phone-model-master";
import { PendingList } from "@/components/admin/PendingList";
import type { PhoneModelOption } from "@/types/review";

// Always live — the pending queue must never be served from a stale static cache.
export const dynamic = "force-dynamic";

export default async function AdminPendingPage() {
  const [reviews, masterResult] = await Promise.allSettled([
    getAdminReviews({ status: "pending" }),
    getActivePhoneModelOptions(),
  ]);

  const pendingReviews = reviews.status === "fulfilled" ? reviews.value : [];
  if (reviews.status === "rejected") {
    console.error("Failed to load pending reviews", reviews.reason);
  }

  let phoneModels: PhoneModelOption[] = [];
  let masterSource: "database" | "fallback" = "database";
  let masterWarning: string | null = null;

  if (masterResult.status === "fulfilled" && masterResult.value.length > 0) {
    phoneModels = masterResult.value;
  } else {
    masterSource = "fallback";
    phoneModels = getFallbackPhoneModelOptions();
    if (masterResult.status === "rejected") {
      console.error("Failed to load phone_model_master", masterResult.reason);
      masterWarning = "ไม่สามารถโหลดรายการรุ่นจากฐานข้อมูลได้ ขณะนี้กำลังใช้รายการสำรอง";
    } else {
      masterWarning = "ไม่พบรุ่นที่ active ในฐานข้อมูล ขณะนี้กำลังใช้รายการสำรอง";
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-primary">รอตรวจสอบ</h1>
        <p className="mt-1 text-sm text-label">
          {pendingReviews.length} รายการรอดำเนินการ · แก้ไขข้อมูลแล้ว Approve / ซ่อน / มาร์คซ้ำ
        </p>
      </div>

      <PendingList
        initialReviews={pendingReviews}
        phoneModels={phoneModels}
        masterSource={masterSource}
        masterWarning={masterWarning}
      />
    </div>
  );
}
