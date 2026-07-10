import { ReviewCard } from "@/components/reviews/ReviewCard";
import type { ReviewWithMedia } from "@/types/review";

export function ReviewGrid({ reviews }: { reviews: ReviewWithMedia[] }) {
  if (reviews.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-card border border-white/60 bg-white/60 py-16 text-center shadow-card backdrop-blur">
        <span className="mb-1 text-4xl" aria-hidden>🌸</span>
        <p className="font-display text-title-md font-semibold text-text-strong">ไม่พบรีวิวที่ตรงกับตัวกรอง</p>
        <p className="text-sm text-label">ลองปรับตัวกรองหรือคำค้นหาใหม่อีกครั้ง</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
      {reviews.map((review) => (
        <ReviewCard key={review.id} review={review} />
      ))}
    </div>
  );
}
