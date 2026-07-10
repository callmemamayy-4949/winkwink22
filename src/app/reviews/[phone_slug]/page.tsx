import { SiteHeader } from "@/components/layout/SiteHeader";
import { ReviewsPageContent } from "@/components/reviews/ReviewsPageContent";

export default async function ReviewsByModelPage({
  params,
  searchParams,
}: {
  params: Promise<{ phone_slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ phone_slug }, resolvedSearchParams] = await Promise.all([params, searchParams]);

  return (
    <>
      <SiteHeader searchParams={resolvedSearchParams} />
      <main className="flex-1">
        <ReviewsPageContent searchParams={resolvedSearchParams} phoneSlug={phone_slug} />
      </main>
    </>
  );
}
