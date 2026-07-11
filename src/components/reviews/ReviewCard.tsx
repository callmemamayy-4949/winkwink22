import {
  LENS_LABELS_TH,
  PLATFORM_LABELS,
  SOURCE_LABELS_TH,
  type ReviewWithMedia,
} from "@/types/review";
import { Badge } from "@/components/ui/Badge";
import { ReviewImage } from "@/components/reviews/ReviewImage";
import { formatCompactNumber, formatThaiDate } from "@/lib/utils/format";

function PlatformIcon({ platform }: { platform: "x" | "tiktok" }) {
  if (platform === "x") {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
        <path d="M18.9 2H22l-7.6 8.7L23.3 22h-7l-5.5-7.2L4.5 22H1.3l8.1-9.3L1 2h7.2l5 6.6L18.9 2Zm-1.2 18h1.7L7.4 3.9H5.6L17.7 20Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
      <path d="M16.6 5.8a4.3 4.3 0 0 1-3-4.3h-3.4v14.6a2.6 2.6 0 1 1-2.6-2.6c.3 0 .5 0 .8.1V10.1a5.9 5.9 0 1 0 5 5.8V9.4a7.6 7.6 0 0 0 4.4 1.4V7.5a4.3 4.3 0 0 1-1.2-1.7Z" />
    </svg>
  );
}

export function ReviewCard({ review }: { review: ReviewWithMedia }) {
  const cover = review.media[0];
  const summary = review.summary_th || review.post_text;
  const lensLabel = LENS_LABELS_TH[review.lens_status] ?? LENS_LABELS_TH.unknown;
  const sourceLabel = SOURCE_LABELS_TH[review.review_source_type] ?? SOURCE_LABELS_TH.unknown;
  const platformLabel = PLATFORM_LABELS[review.platform] ?? review.platform;
  const stats = [
    { label: "RT", value: review.retweet_count },
    { label: "Like", value: review.like_count },
    { label: "View", value: review.view_count },
  ].filter((s) => s.value > 0);

  return (
    <article className="group flex flex-col overflow-hidden rounded-card border border-white/60 bg-white/85 shadow-card backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover">
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-surface-container">
        <div className="h-full w-full transition-transform duration-500 group-hover:scale-105">
          <ReviewImage src={cover?.thumbnail_url ?? cover?.media_url ?? null} alt={summary} />
        </div>

        <div className="absolute left-2.5 top-2.5">
          <Badge tone={review.review_source_type === "shop" ? "mint" : "primary"}>
            {sourceLabel}
          </Badge>
        </div>

        {review.video_quality && (
          <div className="absolute bottom-2.5 right-2.5">
            <Badge tone="white">{review.video_quality}</Badge>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div>
          <h3 className="font-display text-title-md font-semibold text-text-strong leading-snug">
            {review.phone_brand} {review.phone_model}
          </h3>
          {review.place && (
            <p className="mt-0.5 flex items-center gap-1 text-sm font-medium text-primary">
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-3.5 w-3.5 shrink-0"
                aria-hidden
              >
                <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" />
              </svg>
              {review.place}
            </p>
          )}
        </div>

        <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-label">
          <span>{lensLabel}</span>
          {review.year && (
            <>
              <span aria-hidden>•</span>
              <span>{review.year}</span>
            </>
          )}
          <span aria-hidden>•</span>
          <span className="inline-flex items-center gap-1">
            <PlatformIcon platform={review.platform} />
            {platformLabel}
          </span>
        </p>

        <p className="line-clamp-2 text-sm text-text">{summary}</p>

        {stats.length > 0 && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-label">
            {stats.map((s) => (
              <span key={s.label}>
                {formatCompactNumber(s.value)} {s.label}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-white/60 pt-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-primary text-[11px] text-white shadow-sm">
              ♡
            </div>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-xs font-semibold text-text-strong">
                {review.username}
              </p>
              <p className="truncate text-[11px] text-label">{formatThaiDate(review.posted_at)}</p>
            </div>
          </div>
          <a
            href={review.original_url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-full border border-primary/25 bg-primary-container/60 px-3 py-1.5 text-xs font-semibold text-primary transition-transform hover:scale-[1.04] active:scale-95"
          >
            ดูโพสต์ต้นฉบับ
          </a>
        </div>
      </div>
    </article>
  );
}
