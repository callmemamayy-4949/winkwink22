import type { ImportRow } from "@/types/review";
import { buildImportRow } from "@/lib/utils/link-to-row";
import { fetchPostPreview } from "@/lib/utils/oembed";
import { normalizeImportRowPhoneFields } from "@/lib/utils/phone-models";
import { parsePostUrl } from "@/lib/utils/parse-review";

export interface EnrichedImportRowResult {
  row: ImportRow | null;
  parsed: boolean;
  scrapeAttempted: boolean;
  scrapeOk: boolean;
  message: string;
}

function hasValue(value: unknown) {
  return value !== null && value !== undefined && value !== "";
}

function hasItems(value: unknown[] | null | undefined) {
  return Array.isArray(value) && value.length > 0;
}

function hasAnyMedia(row: ImportRow) {
  return hasItems(row.media_urls) || hasValue(row.thumbnail_url) || hasValue(row.preview_image_url);
}

function mergeImportRows(base: ImportRow, fallback: ImportRow, options: { scrapeOk?: boolean } = {}): ImportRow {
  const modelHint = base.model_hint || base.import_note || base.caption || fallback.model_hint || fallback.import_note || fallback.caption || null;
  const postText = options.scrapeOk && fallback.post_text ? fallback.post_text : base.post_text || fallback.post_text;

  return {
    ...base,
    original_url: base.original_url || fallback.original_url,
    platform: base.platform || fallback.platform,
    tweet_id: base.tweet_id || fallback.tweet_id,
    username: base.username || fallback.username,
    display_name: base.display_name || fallback.display_name,
    post_text: postText,
    media_urls: hasItems(base.media_urls) ? base.media_urls : fallback.media_urls,
    thumbnail_url: base.thumbnail_url || fallback.thumbnail_url,
    preview_image_url: base.preview_image_url || fallback.preview_image_url,
    posted_at: base.posted_at || fallback.posted_at,
    source_keyword: base.source_keyword || fallback.source_keyword,
    hashtags: hasItems(base.hashtags) ? base.hashtags : fallback.hashtags,
    phone_brand: base.phone_brand || fallback.phone_brand,
    phone_model: base.phone_model || fallback.phone_model,
    phone_slug: base.phone_slug || fallback.phone_slug,
    lens_status: base.lens_status && base.lens_status !== "unknown" ? base.lens_status : fallback.lens_status,
    suggested_model: base.suggested_model || fallback.suggested_model,
    model_hint: modelHint,
    import_note: base.import_note || base.caption || fallback.import_note || fallback.caption,
    model_match_status: base.model_match_status || fallback.model_match_status,
    place: base.place || fallback.place,
    place_slug: base.place_slug || fallback.place_slug,
    video_quality: base.video_quality || fallback.video_quality,
    year: base.year ?? fallback.year,
    app_used: base.app_used || fallback.app_used,
    summary_th: base.summary_th || fallback.summary_th || (!options.scrapeOk ? modelHint : null),
    confidence: base.confidence ?? fallback.confidence,
    retweet_count: base.retweet_count ?? fallback.retweet_count,
    like_count: base.like_count ?? fallback.like_count,
    reply_count: base.reply_count ?? fallback.reply_count,
    view_count: base.view_count ?? fallback.view_count,
    review_source_type:
      base.review_source_type && base.review_source_type !== "unknown"
        ? base.review_source_type
        : fallback.review_source_type,
    status: base.status || fallback.status,
    scraped_at: base.scraped_at || fallback.scraped_at,
    caption: base.caption || fallback.caption,
  };
}

/**
 * Shared URL enrichment used by both manual link preview and bulk import.
 * It never overwrites CSV-provided values; fetched/parsed data only fills blanks.
 */
export async function enrichImportRowFromUrl(row: ImportRow): Promise<EnrichedImportRowResult> {
  const parsed = parsePostUrl(row.original_url);
  if (!parsed) {
    return {
      row: null,
      parsed: false,
      scrapeAttempted: false,
      scrapeOk: false,
      message: "ไม่ใช่ลิงก์ X/TikTok",
    };
  }

  if (hasAnyMedia(row)) {
    const parsedOnly = buildImportRow(parsed, { ok: false, reason: "media provided" });
    return {
      row: normalizeImportRowPhoneFields(mergeImportRows({ ...row, original_url: parsed.original_url }, parsedOnly)),
      parsed: true,
      scrapeAttempted: false,
      scrapeOk: false,
      message: "ใช้ media จากไฟล์ ไม่ต้องดึงข้อมูลซ้ำ",
    };
  }

  const fetched = await fetchPostPreview(parsed.original_url, parsed.platform);
  return {
    row: normalizeImportRowPhoneFields(mergeImportRows({ ...row, original_url: parsed.original_url }, buildImportRow(parsed, fetched), { scrapeOk: fetched.ok })),
    parsed: true,
    scrapeAttempted: true,
    scrapeOk: fetched.ok,
    message: fetched.ok ? "ดึงข้อมูลสำเร็จ" : `ดึงข้อมูลไม่สำเร็จ: ${fetched.reason ?? "unknown"}`,
  };
}
