import {
  LENS_LABELS_TH,
  PLATFORM_LABELS,
  SOURCE_LABELS_TH,
  type ReviewWithMedia,
} from "@/types/review";
import { Badge } from "@/components/ui/Badge";
import { ReviewImage } from "@/components/reviews/ReviewImage";
import { formatCompactNumber, formatThaiDate } from "@/lib/utils/format";
import { buildReviewSummary, cleanReviewTextForSummary } from "@/lib/utils/parse-review";

const LINE_BOOKING_URL = "https://line.me/R/ti/p/@777orbcb?oat_content=url&ts=10181227";

function compactKey(value: string | null | undefined): string {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9ก-๙]+/g, "");
}

function displayModelTitle(review: ReviewWithMedia): string {
  const brand = review.phone_brand?.trim() ?? "";
  const model = review.phone_model?.trim() ?? "";
  if (!model) return brand || "Winkwink Review";
  if (brand && compactKey(model).startsWith(compactKey(brand))) return model;
  return [brand, model].filter(Boolean).join(" ");
}

function displaySummary(review: ReviewWithMedia, title: string): string {
  const raw = (review.summary_th || review.post_text || "").trim();
  const titleKey = compactKey(title);
  const rawKey = compactKey(raw);
  const brand = review.phone_brand ?? null;
  const model = review.phone_model ?? null;
  const cleanedRaw = cleanReviewTextForSummary(raw, brand, model);

  if (!raw) return "ตัวอย่างภาพจากงานจริง";
  if (rawKey.includes(titleKey) || raw.startsWith("รีวิว")) {
    return buildReviewSummary(review.post_text, brand, model) ?? "ตัวอย่างภาพจากงานจริง";
  }
  if (!cleanedRaw || compactKey(cleanedRaw).includes(titleKey)) {
    return buildReviewSummary(review.post_text, brand, model) ?? "ตัวอย่างภาพจากงานจริง";
  }
  return cleanedRaw.length > 45 ? cleanedRaw.slice(0, 45).trim() : cleanedRaw;
}

function displayUsername(review: ReviewWithMedia): string {
  const username = (review.username || review.display_name || "").replace(/^@/, "").trim();
  if (!username) return "รีวิว";
  if (review.review_source_type === "customer") return `@${username.slice(0, 2)}****`;
  return username.startsWith("@") ? username : `@${username}`;
}

export function ReviewCard({ review }: { review: ReviewWithMedia }) {
  const cover = review.media[0];
  const title = displayModelTitle(review);
  const lensLabel = LENS_LABELS_TH[review.lens_status] ?? LENS_LABELS_TH.unknown;
  const sourceLabel = SOURCE_LABELS_TH[review.review_source_type] ?? SOURCE_LABELS_TH.unknown;
  const platformLabel = PLATFORM_LABELS[review.platform] ?? review.platform;
  const summary = displaySummary(review, title);
  const username = displayUsername(review);
  const metadata = [
    lensLabel !== LENS_LABELS_TH.unknown ? lensLabel : null,
    review.year ? String(review.year) : null,
  ].filter((value, index, all): value is string => !!value && all.indexOf(value) === index);
  const likeText = review.like_count > 0 ? `${formatCompactNumber(review.like_count)} ถูกใจ` : null;

  return (
    <article className="group flex flex-col overflow-hidden rounded-card border border-white/60 bg-white/90 shadow-card backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover">
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-t-card bg-surface-container sm:h-80 sm:aspect-auto">
        <div className="h-full w-full transition-transform duration-500 group-hover:scale-105">
          <ReviewImage src={cover?.thumbnail_url ?? cover?.media_url ?? null} alt={summary} />
        </div>

        <div className="absolute left-2 top-2 sm:left-2.5 sm:top-2.5">
          <Badge
            tone={review.review_source_type === "shop" ? "mint" : "white"}
            className="px-2 py-0.5 text-[9px] font-semibold sm:px-2.5 sm:text-[10px]"
          >
            {sourceLabel}
          </Badge>
        </div>

        {review.video_quality && (
          <div className="absolute bottom-2.5 right-2.5 hidden sm:block">
            <Badge tone="white">{review.video_quality}</Badge>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-2.5 sm:gap-3 sm:p-4">
        <div className="space-y-1 sm:space-y-1.5">
          <h3 className="line-clamp-2 font-display text-[15px] font-semibold leading-tight text-text-strong sm:text-title-md sm:leading-snug">
            {title}
          </h3>
          {review.place && (
            <p className="hidden items-center gap-1 text-sm font-medium text-primary sm:flex">
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

        <p className="line-clamp-1 text-[11px] leading-4 text-label sm:flex sm:flex-wrap sm:items-center sm:gap-x-1.5 sm:gap-y-1 sm:text-xs">
          {metadata.map((item, index) => (
            <span key={item}>
              {index > 0 && <span className="mr-1.5" aria-hidden>•</span>}
              {item}
            </span>
          ))}
        </p>

        <p className="line-clamp-2 text-xs leading-5 text-text sm:text-sm sm:leading-6">{summary}</p>

        <div className="mt-auto space-y-2 border-t border-white/60 pt-2 sm:space-y-3 sm:pt-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-primary text-[10px] text-white shadow-sm sm:h-7 sm:w-7 sm:text-[11px]">
              ♡
            </div>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-xs font-semibold text-text-strong">
                {username}
              </p>
              <p className="truncate text-[10px] text-label sm:text-[11px]">
                {formatThaiDate(review.posted_at)}
                {likeText ? ` · ${likeText}` : ""}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
            <a
              href={review.original_url}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-9 rounded-full border border-primary/25 bg-white/70 px-2 py-2 text-center text-[11px] font-semibold text-primary transition-transform hover:scale-[1.02] active:scale-95 sm:text-xs"
            >
              <span className="sm:hidden">ดูคลิป</span>
              <span className="hidden sm:inline">ดูคลิปบน {platformLabel}</span>
            </a>
            <a
              href={LINE_BOOKING_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-9 rounded-full bg-gradient-primary px-2 py-2 text-center text-[11px] font-bold text-on-primary shadow-glow transition-transform hover:scale-[1.03] active:scale-95 sm:text-xs"
            >
              จองรุ่นนี้
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
