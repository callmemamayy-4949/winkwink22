import { getFilterFacets, getPublicReviews } from "@/lib/data/reviews";
import { parseReviewFilters } from "@/lib/utils/query";
import { Hero } from "@/components/reviews/Hero";
import { ReviewsControls } from "@/components/reviews/ReviewsControls";
import { ReviewGrid } from "@/components/reviews/ReviewGrid";

type RawSearchParams = Record<string, string | string[] | undefined>;

export async function ReviewsPageContent({
  searchParams,
  phoneSlug,
}: {
  searchParams: RawSearchParams;
  phoneSlug?: string;
}) {
  const filters = parseReviewFilters(searchParams);
  const [facets, reviews] = await Promise.all([
    getFilterFacets(),
    getPublicReviews(filters, phoneSlug),
  ]);

  const model = phoneSlug ? facets.models.find((m) => m.slug === phoneSlug) : undefined;
  const title = model ? `รีวิว ${model.label}` : "Winkwink Review Gallery";
  const subtitle = model
    ? `คลังรีวิว ${model.label} จาก X และ TikTok ของร้าน Winkwink Rent`
    : "คลังรีวิวจาก X และ TikTok ของร้าน Winkwink Rent — ค้นหา กรอง แล้วส่งลิงก์ให้ลูกค้าได้ทันที";

  return (
    <div className="mx-auto max-w-[1280px] px-4 pb-16 sm:px-6">
      <Hero title={title} subtitle={subtitle} />

      <ReviewsControls
        facets={facets}
        filters={filters}
        basePath={phoneSlug ? `/reviews/${phoneSlug}` : "/reviews"}
        lockModel={Boolean(phoneSlug)}
      />

      <div className="mb-4 mt-6 flex items-center justify-between">
        <p className="font-display text-sm font-medium text-text-strong">
          แสดง <span className="text-primary">{reviews.length}</span> รีวิว
        </p>
      </div>

      <ReviewGrid reviews={reviews} />
    </div>
  );
}
