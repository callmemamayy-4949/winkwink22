export type Platform = "x" | "tiktok";

export type LensStatus = "with_lens" | "without_lens" | "unknown";

export type ReviewSourceType = "customer" | "shop" | "unknown";

export type PostStatus = "pending" | "approved" | "hidden" | "duplicate";

export type ModelMatchStatus = "canonical" | "suggested" | "unknown";

export type MediaType = "image" | "video" | "thumbnail";

export type SortOption =
  | "newest"
  | "oldest"
  | "likes";

/** Mirrors the `posts` table in Supabase. */
export interface Post {
  id: string;
  original_url: string;
  platform: Platform;
  tweet_id: string | null;
  username: string;
  display_name: string;
  post_text: string;
  posted_at: string | null;
  scraped_at: string;
  source_keyword: string | null;
  hashtags: string[];
  phone_brand: string | null;
  phone_model: string | null;
  phone_slug: string | null;
  lens_status: LensStatus;
  suggested_model: string | null;
  model_hint: string | null;
  model_match_status: ModelMatchStatus;
  place: string | null;
  place_slug: string | null;
  video_quality: string | null;
  app_used: string | null;
  year: number | null;
  summary_th: string | null;
  confidence: number | null;
  retweet_count: number;
  like_count: number;
  reply_count: number;
  view_count: number;
  engagement_updated_at: string | null;
  review_source_type: ReviewSourceType;
  status: PostStatus;
  created_at: string;
  updated_at: string;
}

/** Mirrors the `post_media` table in Supabase. */
export interface PostMedia {
  id: string;
  post_id: string;
  media_type: MediaType;
  media_url: string;
  thumbnail_url: string | null;
  sort_order: number;
  created_at: string;
}

/** Mirrors the `scrape_jobs` table in Supabase. */
export interface ScrapeJob {
  id: string;
  keyword: string;
  started_at: string | null;
  finished_at: string | null;
  total_found: number;
  total_inserted: number;
  total_duplicate: number;
  status: "queued" | "running" | "completed" | "failed";
  error_message: string | null;
  created_at: string;
}

/** A post joined with its media, as returned by the data-access layer. */
export interface ReviewWithMedia extends Post {
  media: PostMedia[];
}

/** Canonical phone model rows from `phone_model_master`. */
export interface PhoneModelOption {
  id: string;
  brand: string;
  model_name: string;
  model_slug: string;
  aliases: string[];
  lens_compatible: boolean;
  default_lens_detail: string | null;
}

/**
 * Row shape produced by `scripts/scrape-x.ts` (JSON/CSV export) and accepted
 * by the /admin/import upload flow. `status` is always forced to "pending"
 * on import regardless of what the file contains.
 */
export interface ImportRow {
  original_url: string;
  platform: Platform;
  tweet_id?: string | null;
  username: string;
  display_name?: string | null;
  post_text?: string | null;
  caption?: string | null;
  media_urls?: string[];
  thumbnail_url?: string | null;
  /** Real, directly-renderable cover image for the review card. */
  preview_image_url?: string | null;
  posted_at?: string | null;
  source_keyword?: string | null;
  hashtags?: string[];
  phone_brand?: string | null;
  phone_model?: string | null;
  phone_slug?: string | null;
  lens_status?: LensStatus;
  suggested_model?: string | null;
  model_hint?: string | null;
  import_note?: string | null;
  model_match_status?: ModelMatchStatus;
  place?: string | null;
  place_slug?: string | null;
  video_quality?: string | null;
  year?: number | null;
  app_used?: string | null;
  summary_th?: string | null;
  confidence?: number | null;
  retweet_count?: number | null;
  like_count?: number | null;
  reply_count?: number | null;
  view_count?: number | null;
  review_source_type?: ReviewSourceType;
  status?: PostStatus;
  scraped_at?: string | null;
}

/** Query params accepted by /reviews and /reviews/[phone_slug]. */
export interface ReviewFilters {
  q?: string;
  brand?: string[];
  model?: string[];
  lens?: LensStatus[];
  place?: string[];
  quality?: string[];
  hashtag?: string[];
  year?: string[];
  source?: ReviewSourceType[];
  platform?: Platform[];
  sort?: SortOption;
}

export const SORT_LABELS_TH: Record<SortOption, string> = {
  newest: "ล่าสุด",
  oldest: "เก่าสุด",
  likes: "ถูกใจสูงสุด",
};

export const LENS_LABELS_TH: Record<LensStatus, string> = {
  with_lens: "พร้อมเลนส์เสริม",
  without_lens: "ไม่ใช้เลนส์เสริม",
  unknown: "ไม่ระบุข้อมูล",
};

export const SOURCE_LABELS_TH: Record<ReviewSourceType, string> = {
  customer: "รีวิวจากผู้ใช้งาน",
  shop: "รีวิวจากร้าน",
  unknown: "ไม่ระบุข้อมูล",
};

export const PLATFORM_LABELS: Record<Platform, string> = {
  x: "X",
  tiktok: "TikTok",
};

export const STATUS_LABELS_TH: Record<PostStatus, string> = {
  pending: "รอตรวจสอบ",
  approved: "อนุมัติแล้ว",
  hidden: "ซ่อน",
  duplicate: "ซ้ำ",
};
