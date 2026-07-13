import { ImportReviewsSection } from "@/components/admin/ImportReviewsSection";

export default function AdminImportPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gradient-primary">เพิ่มรีวิว</h1>
        <p className="mt-1 text-sm text-label">นำเข้าจาก CSV หรือกลับไปเพิ่มจากลิงก์ในหน้าเดียวกัน</p>
      </div>

      <ImportReviewsSection />
    </div>
  );
}
