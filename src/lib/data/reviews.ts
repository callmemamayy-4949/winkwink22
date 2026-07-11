import { getPublicSupabase } from "@/lib/supabase/public";
import { getAdminSupabase } from "@/lib/supabase/admin";
import type { Post, PostMedia, ReviewFilters, ReviewWithMedia, SortOption } from "@/types/review";

/**
 * Data-access layer for reviews, backed by Supabase.
 * getPublicReviews/getFilterFacets use the anon client, so Row Level
 * Security guarantees only status="approved" posts are ever returned.
 * getAdminReviews/getReviewById use the service-role client to see every
 * status — only call those from admin routes and server actions.
 */

const SELECT_WITH_MEDIA = "*, post_media(*)";

type PostRow = Post & { post_media: PostMedia[] | null };

function toReviewWithMedia(row: PostRow): ReviewWithMedia {
  const { post_media, ...post } = row;
  return {
    ...post,
    media: [...(post_media ?? [])].sort((a, b) => a.sort_order - b.sort_order),
  };
}

function matchesFilters(review: ReviewWithMedia, filters: ReviewFilters): boolean {
  if (filters.q) {
    const q = filters.q.toLowerCase();
    const haystack = [
      review.post_text,
      review.summary_th,
      review.phone_brand,
      review.phone_model,
      review.place,
      review.display_name,
      review.username,
      ...review.hashtags,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(q)) return false;
  }

  if (filters.brand?.length && !filters.brand.includes(review.phone_brand ?? "")) {
    return false;
  }
  if (filters.model?.length && !filters.model.includes(review.phone_slug ?? "")) {
    return false;
  }
  if (filters.lens?.length && !filters.lens.includes(review.lens_status)) {
    return false;
  }
  if (filters.place?.length && !filters.place.includes(review.place_slug ?? "")) {
    return false;
  }
  if (filters.quality?.length && !filters.quality.includes(review.video_quality ?? "")) {
    return false;
  }
  if (
    filters.hashtag?.length &&
    !filters.hashtag.some((h) => review.hashtags.includes(h))
  ) {
    return false;
  }
  if (filters.year?.length && !filters.year.includes(String(review.year ?? ""))) {
    return false;
  }
  if (filters.source?.length && !filters.source.includes(review.review_source_type)) {
    return false;
  }
  if (filters.platform?.length && !filters.platform.includes(review.platform)) {
    return false;
  }

  return true;
}

function sortReviews(reviews: ReviewWithMedia[], sort: SortOption = "newest") {
  const sorted = [...reviews];
  // posted_at can be null (e.g. manual-added reviews). Treat null as "no date":
  // it sorts to the end in every date ordering rather than crashing.
  const byDate = (a: ReviewWithMedia, b: ReviewWithMedia, dir: 1 | -1) => {
    if (!a.posted_at && !b.posted_at) return 0;
    if (!a.posted_at) return 1;
    if (!b.posted_at) return -1;
    return dir * a.posted_at.localeCompare(b.posted_at);
  };
  switch (sort) {
    case "oldest":
      return sorted.sort((a, b) => byDate(a, b, 1));
    case "most_retweets":
      return sorted.sort((a, b) => b.retweet_count - a.retweet_count);
    case "most_likes":
      return sorted.sort((a, b) => b.like_count - a.like_count);
    case "most_views":
      return sorted.sort((a, b) => b.view_count - a.view_count);
    case "newest":
    default:
      return sorted.sort((a, b) => byDate(a, b, -1));
  }
}

/** Public gallery: approved reviews only, optionally pre-scoped to a phone slug. */
export async function getPublicReviews(
  filters: ReviewFilters,
  phoneSlug?: string
): Promise<ReviewWithMedia[]> {
  const supabase = getPublicSupabase();
  let query = supabase.from("posts").select(SELECT_WITH_MEDIA).eq("status", "approved");
  if (phoneSlug) query = query.eq("phone_slug", phoneSlug);

  const { data, error } = await query;
  if (error) {
    console.error("Failed to load reviews", error);
    return [];
  }

  const reviews = ((data ?? []) as PostRow[]).map(toReviewWithMedia);
  const filtered = reviews.filter((r) => matchesFilters(r, filters));
  return sortReviews(filtered, filters.sort);
}

/** Admin: every status, with the same filter/search/sort support. */
export async function getAdminReviews(
  filters: ReviewFilters & { status?: string }
): Promise<ReviewWithMedia[]> {
  const supabase = getAdminSupabase();
  let query = supabase.from("posts").select(SELECT_WITH_MEDIA);
  if (filters.status) query = query.eq("status", filters.status);

  const { data, error } = await query;
  if (error) {
    console.error("Failed to load admin reviews", error);
    return [];
  }

  const reviews = ((data ?? []) as PostRow[]).map(toReviewWithMedia);
  const filtered = reviews.filter((r) => matchesFilters(r, filters));
  return sortReviews(filtered, filters.sort);
}

export async function getReviewById(id: string): Promise<ReviewWithMedia | undefined> {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from("posts")
    .select(SELECT_WITH_MEDIA)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error(`Failed to load review ${id}`, error);
    return undefined;
  }
  return data ? toReviewWithMedia(data as PostRow) : undefined;
}

export interface FilterFacets {
  brands: string[];
  models: { slug: string; label: string; brand: string }[];
  places: { slug: string; label: string }[];
  qualities: string[];
  hashtags: string[];
  years: number[];
}

/** Distinct filter option values, derived from approved reviews. */
export async function getFilterFacets(): Promise<FilterFacets> {
  const supabase = getPublicSupabase();
  const { data, error } = await supabase.from("posts").select("*").eq("status", "approved");
  if (error) {
    console.error("Failed to load filter facets", error);
    return {
      brands: [],
      models: [],
      places: [],
      qualities: [],
      hashtags: [],
      years: [],
    };
  }

  const approved = (data ?? []) as Post[];

  const brands = Array.from(new Set(approved.map((r) => r.phone_brand).filter(Boolean))) as string[];

  const modelMap = new Map<string, { slug: string; label: string; brand: string }>();
  approved.forEach((r) => {
    if (r.phone_slug && r.phone_model) {
      modelMap.set(r.phone_slug, {
        slug: r.phone_slug,
        label: r.phone_model,
        brand: r.phone_brand ?? "",
      });
    }
  });

  const placeMap = new Map<string, { slug: string; label: string }>();
  approved.forEach((r) => {
    if (r.place_slug && r.place) {
      placeMap.set(r.place_slug, { slug: r.place_slug, label: r.place });
    }
  });

  const qualities = Array.from(
    new Set(approved.map((r) => r.video_quality).filter(Boolean))
  ) as string[];

  const hashtags = Array.from(new Set(approved.flatMap((r) => r.hashtags)));

  const years = Array.from(
    new Set(approved.map((r) => r.year).filter((y): y is number => y != null))
  ).sort((a, b) => b - a);

  return {
    brands: brands.sort(),
    models: Array.from(modelMap.values()).sort((a, b) => a.label.localeCompare(b.label)),
    places: Array.from(placeMap.values()).sort((a, b) => a.label.localeCompare(b.label)),
    qualities: qualities.sort(),
    hashtags: hashtags.sort(),
    years,
  };
}
