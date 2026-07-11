import {
  LENS_LABELS_TH,
  PLATFORM_LABELS,
  SOURCE_LABELS_TH,
  type ReviewWithMedia,
} from "@/types/review";
import { Badge } from "@/components/ui/Badge";
import { ReviewImage } from "@/components/reviews/ReviewImage";
import { formatCompactNumber, formatThaiDate } from "@/lib/utils/format";

const LINE_BOOKING_URL = "https://line.me/R/ti/p/@777orbcb?oat_content=url&ts=10181227";

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

function displaySummary(review: ReviewWithMedia, title: string, lensLabel: string): string {
  const raw = (review.summary_th || review.post_text || "").trim();
  const titleKey = compactKey(title);
  const rawKey = compactKey(raw);
  const lensText = lensLabel !== LENS_LABELS_TH.unknown ? ` ${lensLabel}` : "";

  if (!raw) return `ตัวอย่างภาพจากงานจริง${lensText}`;
  if (rawKey.includes(titleKey) || raw.startsWith("รีวิว")) {
    return review.place ? `รีวิวจาก${review.place}${lensText}` : `ตัวอย่างภาพจากงานจริง${lensText}`;
  }
  return raw;
}

function displayUsername(review: ReviewWithMedia): string {
  const username = (review.username || review.display_name || "").replace(/^@/, "").trim();
  if (!username) return "รีวิว";
  if (review.review_source_type === "customer") return username.slice(0, 2);
  return username.startsWith("@") ? username : `@${username}`;
}

export function ReviewCard({ review }: { review: ReviewWithMedia }) {
  const cover = review.media[0];
  const title = displayModelTitle(review);
  const lensLabel = LENS_LABELS_TH[review.lens_status] ?? LENS_LABELS_TH.unknown;
  const sourceLabel = SOURCE_LABELS_TH[review.review_source_type] ?? SOURCE_LABELS_TH.unknown;
  const platformLabel = PLATFORM_LABELS[review.platform] ?? review.platform;
  const summary = displaySummary(review, title, lensLabel);
  const username = displayUsername(review);
  const metadata = [
    lensLabel !== LENS_LABELS_TH.unknown ? lensLabel : null,
    review.year ? String(review.year) : null,
    platformLabel,
  ].filter((value, index, all): value is string => !!value && all.indexOf(value) === index);
  const stats = [
    { label: "รีโพสต์", value: review.retweet_count },
    { label: "ถูกใจ", value: review.like_count },
    { label: "เข้าชม", value: review.view_count },
  ].filter((s) => s.value > 0);

  return (
    <article className="group flex flex-col overflow-hidden rounded-card border border-white/60 bg-white/90 shadow-card backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover">
      <div className="relative h-72 w-full overflow-hidden rounded-t-card bg-surface-container sm:h-80">
        <div className="h-full w-full transition-transform duration-500 group-hover:scale-105">
          <ReviewImage src={cover?.thumbnail_url ?? cover?.media_url ?? null} alt={summary} />
        </div>

        <div className="absolute left-2.5 top-2.5">
          <Badge
            tone={review.review_source_type === "shop" ? "mint" : "white"}
            className="px-2.5 py-0.5 text-[10px] font-semibold"
          >
            {sourceLabel}
          </Badge>
        </div>

        {review.video_quality && (
          <div className="absolute bottom-2.5 right-2.5">
            <Badge tone="white">{review.video_quality}</Badge>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="space-y-1.5">
          <h3 className="font-display text-title-md font-semibold leading-snug text-text-strong">
            {title}
          </h3>
          {review.place && (
            <p className="flex items-center gap-1 text-sm font-medium text-primary">
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

        <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-label">
          {metadata.map((item, index) => (
            <span key={item} className={item === platformLabel ? "inline-flex items-center gap-1" : ""}>
              {index > 0 && <span className="mr-1.5" aria-hidden>•</span>}
              {item === platformLabel && <PlatformIcon platform={review.platform} />}
              {item}
            </span>
          ))}
        </p>

        <p className="line-clamp-2 text-sm leading-6 text-text">{summary}</p>

        {stats.length > 0 && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-label">
            {stats.map((s) => (
              <span key={s.label}>
                {formatCompactNumber(s.value)} {s.label}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto space-y-3 border-t border-white/60 pt-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-primary text-[11px] text-white shadow-sm">
              ♡
            </div>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-xs font-semibold text-text-strong">
                {username}
              </p>
              <p className="truncate text-[11px] text-label">{formatThaiDate(review.posted_at)}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1.2fr]">
            <a
              href={review.original_url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-primary/25 bg-white/70 px-3 py-2 text-center text-xs font-semibold text-primary transition-transform hover:scale-[1.02] active:scale-95"
            >
              ดูคลิปบน {platformLabel}
            </a>
            <a
              href={LINE_BOOKING_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-gradient-primary px-4 py-2 text-center text-xs font-bold text-on-primary shadow-glow transition-transform hover:scale-[1.03] active:scale-95"
            >
              จองรุ่นนี้
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
