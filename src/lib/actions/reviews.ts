"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdminSession } from "@/lib/auth/admin";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { fetchPostViaOembed, type FetchedPost } from "@/lib/utils/oembed";
import { enrichImportRowFromUrl } from "@/lib/utils/enrich-import-row";
import { normalizePhoneModel } from "@/lib/utils/phone-models";
import { parsePostUrl } from "@/lib/utils/parse-review";
import { slugify } from "@/lib/utils/slugify";
import type {
  ImportRow,
  LensStatus,
  ModelMatchStatus,
  Platform,
  PostStatus,
  ReviewSourceType,
} from "@/types/review";

/**
 * Server Actions — every export here is a real POST endpoint reachable by
 * anyone who can send the right request, not just from this app's UI (see
 * Next.js Server Actions security notes). Inputs are whitelisted/validated
 * field-by-field rather than trusted as-is. There is no admin auth in this
 * app yet, so these actions are only as safe as "not linked from the public
 * site" — add real authentication before this goes further than local/admin
 * use.
 */

const LENS_VALUES: LensStatus[] = ["with_lens", "without_lens", "unknown"];
const SOURCE_VALUES: ReviewSourceType[] = ["customer", "shop", "unknown"];
const PLATFORM_VALUES: Platform[] = ["x", "tiktok"];
const STATUS_VALUES: PostStatus[] = ["pending", "approved", "hidden", "duplicate"];
const MODEL_MATCH_VALUES: ModelMatchStatus[] = ["canonical", "suggested", "unknown"];

function revalidateReviewPaths() {
  // Simplest correct option: no local layout exists under app/reviews, so
  // targeting the root layout invalidates the public gallery, the phone
  // detail pages, and every /admin page in one call.
  revalidatePath("/", "layout");
}

const VIDEO_EXT = /\.(mp4|mov|webm|m3u8)(\?|$)/i;

function guessMediaType(url: string): "image" | "video" {
  return VIDEO_EXT.test(url) ? "video" : "image";
}

interface NewMediaRow {
  media_type: "image" | "video" | "thumbnail";
  media_url: string;
  thumbnail_url: string | null;
  sort_order: number;
}

/**
 * Order media so the review card's cover (media[0]) is the best real image:
 * preview image first (photo / video poster), then any remaining media URLs.
 */
function buildMediaRows(
  previewImageUrl: string | null,
  mediaUrls: string[],
  thumbnailUrl: string | null
): NewMediaRow[] {
  const rows: NewMediaRow[] = [];
  const used = new Set<string>();
  let order = 0;

  const primary = previewImageUrl || thumbnailUrl || null;
  if (primary) {
    rows.push({ media_type: "image", media_url: primary, thumbnail_url: primary, sort_order: order++ });
    used.add(primary);
  }

  for (const url of mediaUrls) {
    if (!url || used.has(url)) continue;
    used.add(url);
    rows.push({ media_type: guessMediaType(url), media_url: url, thumbnail_url: null, sort_order: order++ });
  }

  return rows;
}

async function insertPostWithMedia(
  supabase: SupabaseClient,
  newPost: Record<string, unknown>,
  previewImageUrl: string | null,
  mediaUrls: string[],
  thumbnailUrl: string | null
): Promise<string> {
  const { data, error } = await supabase.from("posts").insert(newPost).select("id").single();
  if (error) throw new Error(error.message);

  const postId = data.id as string;
  const mediaRows = buildMediaRows(previewImageUrl, mediaUrls, thumbnailUrl);

  if (mediaRows.length > 0) {
    const { error: mediaError } = await supabase
      .from("post_media")
      .insert(mediaRows.map((m) => ({ ...m, post_id: postId })));
    if (mediaError) {
      throw new Error(`บันทึกโพสต์สำเร็จ แต่บันทึกรูป/วิดีโอไม่สำเร็จ: ${mediaError.message}`);
    }
  }

  return postId;
}

// ─────────────────────────────────────────────────────────────
// Update an existing post (status change + field edits)
// ─────────────────────────────────────────────────────────────

export interface PostPatch {
  phone_brand?: string | null;
  phone_model?: string | null;
  phone_slug?: string | null;
  lens_status?: LensStatus;
  suggested_model?: string | null;
  model_hint?: string | null;
  model_match_status?: ModelMatchStatus;
  place?: string | null;
  place_slug?: string | null;
  video_quality?: string | null;
  year?: number | null;
  app_used?: string | null;
  hashtags?: string[];
  platform?: Platform;
  review_source_type?: ReviewSourceType;
  summary_th?: string | null;
  status?: PostStatus;
}

function sanitizePatch(patch: PostPatch): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  const hasPhonePatch = "phone_brand" in patch || "phone_model" in patch || "phone_slug" in patch;
  if (hasPhonePatch) {
    if (patch.model_match_status === "canonical" && patch.phone_model && patch.phone_slug) {
      out.phone_brand = patch.phone_brand || null;
      out.phone_model = patch.phone_model;
      out.phone_slug = patch.phone_slug;
      out.suggested_model = patch.suggested_model || null;
      out.model_match_status = "canonical";
      if (patch.phone_model.includes("+ Lens")) out.lens_status = "with_lens";
    } else {
      const phone = normalizePhoneModel({
        phoneBrand: patch.phone_brand,
        phoneModel: patch.phone_model,
        phoneSlug: patch.phone_slug,
        texts: [patch.summary_th],
      });
      out.phone_brand = phone.phone_brand;
      out.phone_model = phone.phone_model;
      out.phone_slug = phone.phone_slug;
      out.suggested_model = patch.suggested_model || phone.suggested_model || null;
      out.model_match_status = phone.model_match_status;
      if (phone.lens_status !== "unknown") out.lens_status = phone.lens_status;
    }
  } else if ("suggested_model" in patch) {
    out.suggested_model = patch.suggested_model || null;
  }
  if ("model_hint" in patch) out.model_hint = patch.model_hint || null;
  if ("model_match_status" in patch) {
    if (patch.model_match_status && !MODEL_MATCH_VALUES.includes(patch.model_match_status)) {
      throw new Error("model_match_status ไม่ถูกต้อง");
    }
    out.model_match_status = patch.model_match_status || "unknown";
  }
  if ("place" in patch) out.place = patch.place || null;
  if ("place_slug" in patch) out.place_slug = patch.place_slug || null;
  if ("video_quality" in patch) out.video_quality = patch.video_quality || null;
  if ("year" in patch) out.year = patch.year ?? null;
  if ("app_used" in patch) out.app_used = patch.app_used || null;
  if ("summary_th" in patch) out.summary_th = patch.summary_th || null;
  if (patch.hashtags) out.hashtags = patch.hashtags;

  if (patch.lens_status !== undefined) {
    if (!LENS_VALUES.includes(patch.lens_status)) throw new Error("lens_status ไม่ถูกต้อง");
    const normalizedModel = typeof out.phone_model === "string" ? out.phone_model : null;
    out.lens_status =
      normalizedModel?.includes("+ Lens")
        ? "with_lens"
        : patch.lens_status === "with_lens" && hasPhonePatch
          ? out.lens_status ?? "unknown"
          : patch.lens_status;
  }
  if (patch.platform !== undefined) {
    if (!PLATFORM_VALUES.includes(patch.platform)) throw new Error("platform ไม่ถูกต้อง");
    out.platform = patch.platform;
  }
  if (patch.review_source_type !== undefined) {
    if (!SOURCE_VALUES.includes(patch.review_source_type)) throw new Error("review_source_type ไม่ถูกต้อง");
    out.review_source_type = patch.review_source_type;
  }
  if (patch.status !== undefined) {
    if (!STATUS_VALUES.includes(patch.status)) throw new Error("status ไม่ถูกต้อง");
    out.status = patch.status;
  }

  return out;
}

export async function updatePost(
  id: string,
  patch: PostPatch
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdminSession();

  if (!id || typeof id !== "string") return { ok: false, error: "Missing id" };

  let updates: Record<string, unknown>;
  try {
    updates = sanitizePatch(patch);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ข้อมูลไม่ถูกต้อง" };
  }
  if (Object.keys(updates).length === 0) return { ok: false, error: "ไม่มีข้อมูลที่จะบันทึก" };

  const supabase = getAdminSupabase();
  const { error } = await supabase.from("posts").update(updates).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidateReviewPaths();
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────
// Manual add (single review, entered by hand in the admin UI)
// ─────────────────────────────────────────────────────────────

export interface ManualReviewInput {
  original_url: string;
  platform: Platform;
  username: string;
  display_name: string;
  review_text: string;
  media_url: string;
  phone_brand: string;
  phone_model: string;
  lens_status: LensStatus;
  place: string;
  video_quality: string;
  year: string;
  hashtags: string;
  review_source_type: ReviewSourceType;
  summary_th: string;
  save_as: "pending" | "approved";
  tweet_id?: string | null;
}

/**
 * Best-effort auto-fill of a post's text/author/thumbnail from a link, using
 * the official public oEmbed endpoints. Thin server-action wrapper around the
 * shared, framework-agnostic helper in src/lib/utils/oembed.ts (also used by
 * the local scripts/links-to-csv.ts). X's oEmbed can 404 for some posts, so
 * callers must treat failure as normal and fall back to manual paste.
 */
export async function fetchPostText(url: string, platform: Platform): Promise<FetchedPost> {
  await requireAdminSession();
  return fetchPostViaOembed(url, platform);
}

// ─────────────────────────────────────────────────────────────
// Bulk link preview (for /admin/manual-add paste-many-links)
// ─────────────────────────────────────────────────────────────

export interface LinkPreview {
  /** Original text the admin pasted for this entry (for error display). */
  input: string;
  ok: boolean;
  error?: string;
  existsInDb: boolean;
  videoUrl: string | null;
  row: ImportRow | null;
}

const MAX_PREVIEW_LINKS = 40;

/** Resolve a batch of pasted links into preview rows + duplicate status. */
export async function previewLinks(rawUrls: string[]): Promise<LinkPreview[]> {
  await requireAdminSession();

  const urls = rawUrls.map((u) => u.trim()).filter(Boolean).slice(0, MAX_PREVIEW_LINKS);
  if (urls.length === 0) return [];

  // Parse + fetch each (limited concurrency to be polite to the endpoints).
  const results: LinkPreview[] = new Array(urls.length);
  const CONCURRENCY = 4;
  let cursor = 0;
  async function worker() {
    while (cursor < urls.length) {
      const i = cursor++;
      const input = urls[i];
      const parsed = parsePostUrl(input);
      if (!parsed) {
        results[i] = { input, ok: false, error: "ไม่ใช่ลิงก์ X/TikTok", existsInDb: false, videoUrl: null, row: null };
        continue;
      }
      const enriched = await enrichImportRowFromUrl({
        original_url: input,
        platform: parsed.platform,
        username: "",
      });
      results[i] = {
        input,
        ok: !!enriched.row,
        error: enriched.row ? undefined : enriched.message,
        existsInDb: false, // filled in below
        videoUrl: parsed.video_url,
        row: enriched.row,
      };
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, urls.length) }, worker));

  // One batched duplicate check against Supabase.
  const originalUrls = results
    .map((r) => r.row?.original_url)
    .filter((u): u is string => !!u);
  if (originalUrls.length > 0) {
    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from("posts")
      .select("original_url")
      .in("original_url", originalUrls);
    if (!error) {
      const existing = new Set((data ?? []).map((r) => r.original_url as string));
      for (const r of results) {
        if (r.row && existing.has(r.row.original_url)) r.existsInDb = true;
      }
    }
  }

  return results;
}

/**
 * Lightweight duplicate check used by /admin/manual-add to warn the admin
 * early (before they fill the form) that a link is already in the system.
 * The real guard is the unique constraint + the check inside createManualReview.
 */
export async function checkOriginalUrlExists(
  url: string
): Promise<{ exists: boolean; error?: string }> {
  await requireAdminSession();

  const original_url = url?.trim();
  if (!original_url) return { exists: false, error: "ไม่มีลิงก์" };

  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from("posts")
    .select("id")
    .eq("original_url", original_url)
    .maybeSingle();

  if (error) return { exists: false, error: error.message };
  return { exists: !!data };
}

export async function createManualReview(
  input: ManualReviewInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdminSession();

  const original_url = input.original_url?.trim();
  const username = input.username?.trim();

  if (!original_url) return { ok: false, error: "กรุณากรอก URL โพสต์ต้นฉบับ" };
  if (!username) return { ok: false, error: "กรุณากรอก username" };
  if (!PLATFORM_VALUES.includes(input.platform)) return { ok: false, error: "platform ไม่ถูกต้อง" };
  if (input.save_as !== "pending" && input.save_as !== "approved") {
    return { ok: false, error: "save_as ไม่ถูกต้อง" };
  }

  const supabase = getAdminSupabase();

  const { data: existing, error: lookupError } = await supabase
    .from("posts")
    .select("id")
    .eq("original_url", original_url)
    .maybeSingle();
  if (lookupError) return { ok: false, error: lookupError.message };
  if (existing) return { ok: false, error: "URL นี้มีอยู่ในระบบแล้ว (ซ้ำ)" };

  const year = input.year ? Number(input.year) : null;
  const hashtags = input.hashtags
    ? input.hashtags.split(",").map((h) => h.trim()).filter(Boolean)
    : [];
  const phone = normalizePhoneModel({
    phoneBrand: input.phone_brand,
    phoneModel: input.phone_model,
    texts: [input.review_text, input.summary_th],
  });
  const lensStatus = phone.phone_model?.includes("+ Lens")
    ? "with_lens"
    : input.lens_status === "without_lens"
      ? "without_lens"
      : phone.lens_status;

  const newPost = {
    original_url,
    platform: input.platform,
    tweet_id: input.tweet_id?.trim() || null,
    username,
    display_name: input.display_name?.trim() || username,
    post_text: input.review_text ?? "",
    posted_at: null,
    scraped_at: new Date().toISOString(),
    source_keyword: "manual",
    hashtags,
    phone_brand: phone.phone_brand,
    phone_model: phone.phone_model,
    phone_slug: phone.phone_slug,
    lens_status: LENS_VALUES.includes(lensStatus) ? lensStatus : "unknown",
    suggested_model: phone.suggested_model,
    model_hint: null,
    model_match_status: phone.model_match_status,
    place: input.place || null,
    place_slug: input.place ? slugify(input.place) : null,
    video_quality: input.video_quality || null,
    app_used: null,
    year: Number.isFinite(year) ? year : null,
    summary_th: input.summary_th || null,
    confidence: null,
    retweet_count: 0,
    like_count: 0,
    reply_count: 0,
    view_count: 0,
    review_source_type: SOURCE_VALUES.includes(input.review_source_type)
      ? input.review_source_type
      : "unknown",
    status: input.save_as,
  };

  try {
    await insertPostWithMedia(supabase, newPost, null, input.media_url ? [input.media_url] : [], null);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "บันทึกไม่สำเร็จ" };
  }

  revalidateReviewPaths();
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────
// Bulk import (from /admin/import — JSON/CSV exported by scripts/scrape-x.ts)
// ─────────────────────────────────────────────────────────────

export interface ImportSummary {
  total: number;
  inserted: number;
  duplicate: number;
  scrapeSuccess: number;
  scrapeFailed: number;
  suggestedModelCount: number;
  unmatchedModelCount: number;
  failed: number;
  errors: { row: number; message: string }[];
  rowLogs: {
    row: number;
    original_url: string;
    status: "inserted" | "duplicate" | "scrape_success" | "scrape_failed" | "error";
    scrape_status?: "success" | "failed" | "skipped" | "not_attempted";
    insert_status?: "inserted" | "duplicate" | "skipped" | "error";
    model_match_status?: ModelMatchStatus;
    message: string;
  }[];
}

function validateImportRow(row: ImportRow): string | null {
  if (!row || typeof row !== "object") return "แถวข้อมูลไม่ถูกต้อง";
  if (!row.original_url || typeof row.original_url !== "string") return "ไม่มี original_url";
  if (row.platform !== "x" && row.platform !== "tiktok") return "platform ต้องเป็น x หรือ tiktok";
  if (!row.username || typeof row.username !== "string") return "ไม่มี username";
  return null;
}

function toNewPostRow(row: ImportRow) {
  return {
    original_url: row.original_url,
    platform: row.platform,
    tweet_id: row.tweet_id ?? null,
    username: row.username,
    display_name: row.display_name || row.username,
    post_text: row.post_text ?? "",
    posted_at: row.posted_at ?? null,
    scraped_at: row.scraped_at ?? new Date().toISOString(),
    source_keyword: row.source_keyword ?? null,
    hashtags: row.hashtags ?? [],
    phone_brand: row.phone_brand ?? null,
    phone_model: row.phone_model ?? null,
    phone_slug: row.phone_slug ?? null,
    lens_status: LENS_VALUES.includes(row.lens_status as LensStatus) ? row.lens_status : "unknown",
    suggested_model: row.suggested_model ?? null,
    model_hint: row.model_hint ?? row.import_note ?? row.caption ?? null,
    model_match_status: MODEL_MATCH_VALUES.includes(row.model_match_status as ModelMatchStatus)
      ? row.model_match_status
      : "unknown",
    place: row.place ?? null,
    place_slug: row.place_slug ?? null,
    video_quality: row.video_quality ?? null,
    app_used: row.app_used ?? null,
    year: row.year ?? null,
    summary_th: row.summary_th ?? null,
    confidence: row.confidence ?? null,
    retweet_count: row.retweet_count ?? 0,
    like_count: row.like_count ?? 0,
    reply_count: row.reply_count ?? 0,
    view_count: row.view_count ?? 0,
    review_source_type: SOURCE_VALUES.includes(row.review_source_type as ReviewSourceType)
      ? row.review_source_type
      : "unknown",
    // Imported rows are never trusted with a status from the file — every
    // import lands as pending and must be approved by an admin.
    status: "pending" as const,
  };
}

const MAX_IMPORT_ROWS = 200;

export async function importReviews(rows: ImportRow[]): Promise<ImportSummary> {
  await requireAdminSession();

  const summary: ImportSummary = {
    total: rows.length,
    inserted: 0,
    duplicate: 0,
    scrapeSuccess: 0,
    scrapeFailed: 0,
    suggestedModelCount: 0,
    unmatchedModelCount: 0,
    failed: 0,
    errors: [],
    rowLogs: [],
  };
  if (rows.length === 0) return summary;
  if (rows.length > MAX_IMPORT_ROWS) {
    summary.failed = rows.length;
    summary.errors.push({
      row: 0,
      message: `ไฟล์มี ${rows.length} รายการ เกินสูงสุด ${MAX_IMPORT_ROWS} รายการต่อครั้ง`,
    });
    summary.rowLogs.push({
      row: 0,
      original_url: "",
      status: "error",
      scrape_status: "not_attempted",
      insert_status: "error",
      model_match_status: "unknown",
      message: `ไฟล์มี ${rows.length} รายการ เกินสูงสุด ${MAX_IMPORT_ROWS} รายการต่อครั้ง`,
    });
    return summary;
  }

  const supabase = getAdminSupabase();

  const seenInBatch = new Set<string>();
  const candidates: { index: number; row: ImportRow }[] = [];

  rows.forEach((row, index) => {
    if (!row || typeof row !== "object") {
      summary.failed++;
      summary.errors.push({ row: index + 1, message: "แถวข้อมูลไม่ถูกต้อง" });
      summary.rowLogs.push({
        row: index + 1,
        original_url: "",
        status: "error",
        scrape_status: "not_attempted",
        insert_status: "error",
        model_match_status: "unknown",
        message: "แถวข้อมูลไม่ถูกต้อง",
      });
      return;
    }
    if (!row.original_url || typeof row.original_url !== "string") {
      summary.failed++;
      summary.errors.push({ row: index + 1, message: "ไม่มี original_url" });
      summary.rowLogs.push({
        row: index + 1,
        original_url: "",
        status: "error",
        scrape_status: "not_attempted",
        insert_status: "error",
        model_match_status: "unknown",
        message: "ไม่มี original_url",
      });
      return;
    }
    const parsed = parsePostUrl(row.original_url);
    const normalizedRow = parsed
      ? {
          ...row,
          original_url: parsed.original_url,
          platform: row.platform || parsed.platform,
          tweet_id: row.tweet_id || parsed.tweet_id,
          username: row.username || (parsed.username ? `@${parsed.username}` : row.username),
        }
      : row;

    if (seenInBatch.has(normalizedRow.original_url)) {
      summary.duplicate++;
      summary.rowLogs.push({
        row: index + 1,
        original_url: normalizedRow.original_url,
        status: "duplicate",
        scrape_status: "not_attempted",
        insert_status: "duplicate",
        model_match_status: normalizedRow.model_match_status ?? "unknown",
        message: "original_url ซ้ำในไฟล์เดียวกัน",
      });
      return;
    }
    seenInBatch.add(normalizedRow.original_url);
    candidates.push({ index, row: normalizedRow });
  });

  if (candidates.length === 0) return summary;

  const urls = candidates.map((c) => c.row.original_url);
  const { data: existingRows, error: existingError } = await supabase
    .from("posts")
    .select("original_url")
    .in("original_url", urls);

  if (existingError) {
    summary.failed += candidates.length;
    summary.errors.push({ row: 0, message: `ตรวจสอบข้อมูลซ้ำไม่สำเร็จ: ${existingError.message}` });
    summary.rowLogs.push({
      row: 0,
      original_url: "",
      status: "error",
      scrape_status: "not_attempted",
      insert_status: "error",
      model_match_status: "unknown",
      message: `ตรวจสอบข้อมูลซ้ำไม่สำเร็จ: ${existingError.message}`,
    });
    return summary;
  }
  const existingUrls = new Set((existingRows ?? []).map((r) => r.original_url as string));

  for (const { index, row } of candidates) {
    if (existingUrls.has(row.original_url)) {
      summary.duplicate++;
      summary.rowLogs.push({
        row: index + 1,
        original_url: row.original_url,
        status: "duplicate",
        scrape_status: "not_attempted",
        insert_status: "duplicate",
        model_match_status: row.model_match_status ?? "unknown",
        message: "มี original_url นี้อยู่ใน Supabase แล้ว",
      });
      continue;
    }

    const enriched = await enrichImportRowFromUrl(row);
    if (!enriched.row) {
      summary.failed++;
      summary.errors.push({ row: index + 1, message: enriched.message });
      summary.rowLogs.push({
        row: index + 1,
        original_url: row.original_url,
        status: "error",
        scrape_status: "failed",
        insert_status: "error",
        model_match_status: "unknown",
        message: enriched.message,
      });
      continue;
    }

    if (enriched.scrapeAttempted) {
      if (enriched.scrapeOk) {
        summary.scrapeSuccess++;
        summary.rowLogs.push({
          row: index + 1,
          original_url: enriched.row.original_url,
          status: "scrape_success",
          scrape_status: "success",
          insert_status: "skipped",
          model_match_status: enriched.row.model_match_status ?? "unknown",
          message: enriched.message,
        });
      } else {
        summary.scrapeFailed++;
        summary.rowLogs.push({
          row: index + 1,
          original_url: enriched.row.original_url,
          status: "scrape_failed",
          scrape_status: "failed",
          insert_status: "skipped",
          model_match_status: enriched.row.model_match_status ?? "unknown",
          message: enriched.message,
        });
      }
    }

    const err = validateImportRow(enriched.row);
    if (err) {
      summary.failed++;
      summary.errors.push({ row: index + 1, message: err });
      summary.rowLogs.push({
        row: index + 1,
        original_url: enriched.row.original_url,
        status: "error",
        scrape_status: enriched.scrapeAttempted ? (enriched.scrapeOk ? "success" : "failed") : "skipped",
        insert_status: "error",
        model_match_status: enriched.row.model_match_status ?? "unknown",
        message: err,
      });
      continue;
    }

    try {
      await insertPostWithMedia(
        supabase,
        toNewPostRow(enriched.row),
        enriched.row.preview_image_url ?? null,
        enriched.row.media_urls ?? [],
        enriched.row.thumbnail_url ?? null
      );
      summary.inserted++;
      if (enriched.row.model_match_status === "suggested") summary.suggestedModelCount++;
      if (enriched.row.model_match_status === "unknown") summary.unmatchedModelCount++;
      summary.rowLogs.push({
        row: index + 1,
        original_url: enriched.row.original_url,
        status: "inserted",
        scrape_status: enriched.scrapeAttempted ? (enriched.scrapeOk ? "success" : "failed") : "skipped",
        insert_status: "inserted",
        model_match_status: enriched.row.model_match_status ?? "unknown",
        message: "บันทึกเป็น pending แล้ว",
      });
    } catch (e) {
      summary.failed++;
      const message = e instanceof Error ? e.message : "Unknown error";
      summary.errors.push({ row: index + 1, message });
      summary.rowLogs.push({
        row: index + 1,
        original_url: enriched.row.original_url,
        status: "error",
        scrape_status: enriched.scrapeAttempted ? (enriched.scrapeOk ? "success" : "failed") : "skipped",
        insert_status: "error",
        model_match_status: enriched.row.model_match_status ?? "unknown",
        message,
      });
    }
  }

  if (summary.inserted > 0) revalidateReviewPaths();
  return summary;
}
