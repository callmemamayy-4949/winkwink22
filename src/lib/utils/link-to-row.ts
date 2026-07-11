import type { ImportRow } from "@/types/review";
import type { FetchedPost } from "@/lib/utils/oembed";
import { inferReviewSourceType, parseReviewText, type ParsedPostUrl } from "@/lib/utils/parse-review";

/**
 * Build a pending ImportRow from a parsed URL + whatever the preview fetch
 * returned. Framework-agnostic (no next/* imports) so both the local
 * scripts/links-to-csv.ts and the previewLinks server action share it.
 */
export function buildImportRow(parsed: ParsedPostUrl, fetched: FetchedPost): ImportRow {
  const username = parsed.username ? `@${parsed.username}` : "@unknown";
  const postText = fetched.ok ? fetched.post_text ?? "" : "";
  const p = parseReviewText(postText);

  const images = (fetched.media_urls ?? []).filter(Boolean);
  const preview = fetched.preview_image_url ?? images[0] ?? null;

  return {
    original_url: parsed.original_url,
    platform: parsed.platform,
    tweet_id: parsed.tweet_id,
    username,
    display_name: fetched.display_name?.trim() || username,
    post_text: postText,
    media_urls: images,
    thumbnail_url: preview,
    preview_image_url: preview,
    posted_at: null,
    source_keyword: "manual-link",
    hashtags: p.hashtags,
    phone_brand: p.phone_brand,
    phone_model: p.phone_model,
    phone_slug: p.phone_slug,
    lens_status: p.lens_status,
    suggested_model: p.suggested_model,
    model_match_status: p.phone_model ? "canonical" : p.suggested_model ? "suggested" : "unknown",
    place: null,
    place_slug: null,
    video_quality: p.video_quality,
    year: p.year,
    app_used: p.app_used,
    summary_th: p.summary_th,
    confidence: p.confidence,
    retweet_count: null,
    like_count: null,
    reply_count: null,
    view_count: null,
    review_source_type: inferReviewSourceType(username),
    status: "pending",
    scraped_at: new Date().toISOString(),
  };
}
