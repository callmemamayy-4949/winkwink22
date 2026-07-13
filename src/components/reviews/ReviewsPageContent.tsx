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
  const subtitle = "ค้นรีวิวตามรุ่น เลนส์ สถานที่ และปี";

  return (
    <div className="mx-auto max-w-[1280px] px-3 pb-12 pt-4 sm:px-6 sm:pb-16 sm:pt-0">
      <div className="hidden sm:block">
        <Hero title={title} subtitle={subtitle} />
      </div>

      <section className="relative z-40 overflow-visible">
        <ReviewsControls
          facets={facets}
          filters={filters}
          lockModel={Boolean(phoneSlug)}
        />
      </section>

      <div className="mb-3 mt-4 flex items-center justify-between sm:mb-4 sm:mt-6">
        <p className="font-display text-sm font-medium text-text-strong">
          <span className="text-primary">{reviews.length}</span> รีวิว
        </p>
      </div>

      <section className="relative z-0">
        <ReviewGrid reviews={reviews} />
      </section>
    </div>
  );
}
