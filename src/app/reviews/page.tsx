import { SiteHeader } from "@/components/layout/SiteHeader";
import { ReviewsPageContent } from "@/components/reviews/ReviewsPageContent";

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <ReviewsPageContent searchParams={resolvedSearchParams} />
      </main>
    </>
  );
}
