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
  const title = model ? `รีวิว ${model.label}` : "Winkwink Review Center";
  const subtitle = "ค้นหารีวิวตามรุ่นอุปกรณ์ เลนส์ สถานที่ และปีที่ใช้งาน";

  return (
    <div className="mx-auto max-w-[1280px] px-4 pb-16 sm:px-6">
      <Hero title={title} subtitle={subtitle} />

      <ReviewsControls
        facets={facets}
        filters={filters}
        lockModel={Boolean(phoneSlug)}
      />

      <div className="mb-4 mt-6 flex items-center justify-between">
        <p className="font-display text-sm font-medium text-text-strong">
          พบรีวิวทั้งหมด <span className="text-primary">{reviews.length}</span> รายการ
        </p>
      </div>

      <ReviewGrid reviews={reviews} />
    </div>
  );
}
