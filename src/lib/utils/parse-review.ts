import { normalizePhoneModel } from "@/lib/utils/phone-models";
import type { LensStatus, Platform, ReviewSourceType } from "@/types/review";

/**
 * Rule-based review parsing, shared by the local scraper (scripts/scrape-x.ts)
 * and the /admin/manual-add link-first flow. Pure functions only — no server
 * or browser APIs — so it is safe to import from a "use client" component.
 */

// ─── URL helpers ───────────────────────────────────────────────

/** Strip query string / hash so the same post always dedups to one original_url. */
export function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  try {
    const u = new URL(trimmed);
    return `${u.origin}${u.pathname}`.replace(/\/+$/, "");
  } catch {
    return trimmed;
  }
}

export function detectPlatform(url: string): Platform | null {
  const lower = url.toLowerCase();
  if (lower.includes("tiktok.com")) return "tiktok";
  if (lower.includes("x.com") || lower.includes("twitter.com")) return "x";
  return null;
}

/** Reserved first-path segments on X that are not usernames. */
const X_NON_USERNAMES = new Set(["i", "intent", "search", "home", "hashtag", "explore", "notifications", "messages"]);

function isXHost(host: string): boolean {
  const h = host.toLowerCase();
  return h === "x.com" || h.endsWith(".x.com") || h === "twitter.com" || h.endsWith(".twitter.com");
}

export interface ParsedXStatus {
  username: string;
  tweet_id: string;
}

/** `{ username, tweet_id }` from an X/Twitter status URL, or null. */
export function parseXStatusUrl(url: string): ParsedXStatus | null {
  try {
    const u = new URL(url.trim());
    if (!isXHost(u.hostname)) return null;
    const parts = u.pathname.split("/").filter(Boolean);
    const statusIdx = parts.findIndex((p) => p === "status" || p === "statuses");
    if (statusIdx < 1) return null;
    const username = parts[statusIdx - 1];
    const tweet_id = parts[statusIdx + 1]?.match(/^\d+/)?.[0];
    if (!username || !tweet_id || X_NON_USERNAMES.has(username.toLowerCase())) return null;
    return { username, tweet_id };
  } catch {
    return null;
  }
}

/** Canonical `https://x.com/{username}/status/{id}` (drops query, /photo, /video suffix, twitter.com→x.com). */
export function normalizeXUrl(url: string): string {
  const parsed = parseXStatusUrl(url);
  if (!parsed) return normalizeUrl(url);
  return `https://x.com/${parsed.username}/status/${parsed.tweet_id}`;
}

/** X posts expose their video at `<status-url>/video/1`. Best-effort media link. */
export function generateXVideoUrl(originalUrl: string): string {
  return `${originalUrl.replace(/\/+$/, "")}/video/1`;
}

/** "@username" from an X or TikTok post URL, or null if it can't be read. */
export function parseUsernameFromUrl(url: string): string | null {
  try {
    const u = new URL(url.trim());
    const parts = u.pathname.split("/").filter(Boolean);
    if (u.hostname.toLowerCase().includes("tiktok.com")) {
      const handle = parts.find((p) => p.startsWith("@"));
      return handle ?? null;
    }
    // x.com / twitter.com → first segment is the username
    const first = parts[0];
    if (!first || X_NON_USERNAMES.has(first.toLowerCase())) return null;
    return `@${first.replace(/^@/, "")}`;
  } catch {
    return null;
  }
}

/** Tweet id from an X status URL, or null. */
export function parseTweetId(url: string): string | null {
  const m = url.match(/status\/(\d+)/);
  return m ? m[1] : null;
}

export interface ParsedPostUrl {
  platform: Platform;
  /** bare handle, e.g. "daixyjira" (no leading @) */
  username: string;
  tweet_id: string | null;
  original_url: string;
  video_url: string | null;
  media_url: string | null;
}

/**
 * Everything derivable from just a pasted X/TikTok URL — no network needed.
 * For an X status URL this fills tweet_id + a best-effort video_url and uses
 * that as the default media_url. Returns null if the platform isn't recognised.
 */
export function parsePostUrl(rawUrl: string): ParsedPostUrl | null {
  const platform = detectPlatform(rawUrl);
  if (!platform) return null;

  if (platform === "x") {
    const status = parseXStatusUrl(rawUrl);
    if (status) {
      const original_url = normalizeXUrl(rawUrl);
      const video_url = generateXVideoUrl(original_url);
      return {
        platform: "x",
        username: status.username,
        tweet_id: status.tweet_id,
        original_url,
        video_url,
        media_url: video_url,
      };
    }
    // An X URL that isn't a status (profile, etc.) — keep what we can.
    return {
      platform: "x",
      username: (parseUsernameFromUrl(rawUrl) ?? "").replace(/^@/, ""),
      tweet_id: null,
      original_url: normalizeUrl(rawUrl),
      video_url: null,
      media_url: null,
    };
  }

  // TikTok: /@user/video/{id}
  const idMatch = rawUrl.match(/\/video\/(\d+)/);
  return {
    platform: "tiktok",
    username: (parseUsernameFromUrl(rawUrl) ?? "").replace(/^@/, ""),
    tweet_id: idMatch ? idMatch[1] : null,
    original_url: normalizeUrl(rawUrl),
    video_url: null,
    media_url: null,
  };
}

// ─── Text heuristics ───────────────────────────────────────────

/** Extract all #hashtags from text (Thai + latin word chars). */
export function extractHashtags(text: string): string[] {
  const matches = text.match(/#([\wก-๙]+)/gu) ?? [];
  return [...new Set(matches.map((h) => h.slice(1)))];
}

/** Parse engagement numbers like "1.2K" → 1200. */
export function parseCount(text: string | null | undefined): number | null {
  if (!text) return null;
  const clean = text.replace(/,/g, "").trim();
  if (clean === "") return null;
  if (clean.endsWith("K")) return Math.round(parseFloat(clean) * 1_000);
  if (clean.endsWith("M")) return Math.round(parseFloat(clean) * 1_000_000);
  const n = parseInt(clean, 10);
  return isNaN(n) ? null : n;
}

export function extractPhoneInfo(text: string): { brand: string | null; model: string | null; slug: string | null } {
  const normalized = normalizePhoneModel({ texts: [text] });
  return { brand: normalized.phone_brand, model: normalized.phone_model, slug: normalized.phone_slug };
}

export function extractLensStatus(text: string): LensStatus {
  if (/ไม่\s*(?:ต่อ|ติด|มี|เอา|ใช้)\s*เลนส์|no\s*lens|without\s*lens/i.test(text)) return "without_lens";
  if (/เลนส์เสริม|พร้อม\s*เลนส์|ชุด\s*เลนส์|\+\s*(?:lens|เลนส์)|with\s*lens|\blens\s*\d+\s*(?:mm)?\b|\b(?:200|300|400)\s*mm\b|\b(?:200|300|400)mm\b|\blens\b|เลนส์/i.test(text)) return "with_lens";
  return "unknown";
}

export function extractVideoQuality(text: string): string | null {
  const m = text.match(/\b(4K\s*(?:60fps)?|2160p|1080p|720p|FHD|UHD)\b/i);
  return m ? m[1].toUpperCase().trim() : null;
}

export function extractYear(text: string, postedAt: string | null): number | null {
  const m = text.match(/\b(202\d)\b/);
  if (m) return parseInt(m[1], 10);
  if (postedAt) return new Date(postedAt).getFullYear();
  return null;
}

export function extractAppUsed(text: string): string | null {
  const m = text.match(/\b(CapCut|VN|VLLO|InShot|Premiere\s*Pro|Final\s*Cut)\b/i);
  return m ? m[1] : null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function uniqueNonEmpty(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => !!value))];
}

function removeModelTerms(text: string, brand: string | null, model: string | null): string {
  let cleaned = text;
  const modelParts = uniqueNonEmpty([
    brand,
    model,
    model?.replace(/\+?\s*Lens\s*\d+\s*mm/gi, ""),
    model?.replace(brand ?? "", ""),
  ]);

  for (const part of modelParts.sort((a, b) => b.length - a.length)) {
    cleaned = cleaned.replace(new RegExp(escapeRegExp(part), "gi"), " ");
    cleaned = cleaned.replace(new RegExp(escapeRegExp(part).replace(/\\ /g, "\\s*"), "gi"), " ");
  }

  return cleaned
    .replace(/\b(?:samsung|galaxy|vivo|oppo)\b/gi, " ")
    .replace(/\b(?:find\s*)?x\s*\d{1,3}\s*(?:pro|ultra)\b/gi, " ")
    .replace(/\bs\s*\d{2}\s*ultra\b/gi, " ")
    .replace(/\b(?:vivo|oppo)?x\d{1,3}(?:pro|ultra)\b/gi, " ")
    .replace(/\b(?:samsung|galaxy)?s\d{2}ultra\b/gi, " ");
}

export function cleanReviewTextForSummary(text: string, brand: string | null = null, model: string | null = null): string {
  const withoutNoise = removeModelTerms(text, brand, model)
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/@\w+/g, " ")
    .replace(/#[\wก-๙]+/gu, " ")
    .replace(/\b(?:lens|เลนส์)\s*\d+\s*(?:mm)?\b/gi, " ")
    .replace(/\b\d+\s*mm\b/gi, " ")
    .replace(/\+\s*(?:lens|เลนส์)/gi, " ")
    .replace(/(?:พร้อม|มี|ใช้|ต่อ)?\s*(?:เลนส์เสริม|เลนส์)/gi, " ")
    .replace(/(?:ไม่มี|ไม่ใช้|ไม่ต่อ)\s*เลนส์/gi, " ")
    .replace(/รีวิว(?:วิ้งวิ้ง30|เช่าwinkwink)?/gi, " ")
    .replace(/[^\p{L}\p{N}\s.,!?:/%+\-]/gu, " ")
    .replace(/([ก-๙])\1{3,}/gu, "$1$1")
    .replace(/([a-zA-Z])\1{3,}/g, "$1$1")
    .replace(/\s+/g, " ")
    .trim();

  return withoutNoise;
}

function compactSummary(text: string): string | null {
  const cleaned = text.trim();
  if (!cleaned) return null;

  const positive = /ดี|ชัด|สวย|คม|ซูม|ไกล|ประทับใจ|เริ่ด|ปัง|แนะนำ|ชอบ|ละเอียด|เวที|แสง/i.test(cleaned);
  const mentionsStage = /เวที|สเตจ|stage|คอน|concert|โซน|แถว|ดอย|ชั้น|impact/i.test(cleaned);
  const mentionsImage = /ภาพ|คลิป|วิดีโอ|รูป|ถ่าย|ซูม|ชัด|คม|แสง/i.test(cleaned);

  if (mentionsStage && mentionsImage && /ซูม|ไกล/i.test(cleaned)) {
    return "มุมมองเวทีชัด ซูมได้ไกล ประทับใจมาก";
  }
  if (mentionsImage && /คม|ชัด|ละเอียด/i.test(cleaned)) {
    return "ภาพคมชัด เห็นรายละเอียดเวทีชัดเจน";
  }
  if (mentionsImage && /สวย|แสง/i.test(cleaned)) {
    return "ภาพสวย แสงดี เก็บบรรยากาศได้ชัด";
  }
  if (/บริการ|แม่ค้า|ร้าน|ส่ง|รับ|แนะนำ/i.test(cleaned)) {
    return positive ? "ร้านบริการดี ใช้งานแล้วประทับใจ" : "ประสบการณ์เช่าราบรื่น ใช้งานสะดวก";
  }
  if (mentionsStage) {
    return "มุมมองจากที่นั่งเห็นเวทีได้ชัดเจน";
  }
  if (positive) {
    return "ใช้งานดี ภาพชัด น่าประทับใจ";
  }

  return cleaned.split(/[.!?\n。]|(?:\s{2,})/)[0]?.trim() || cleaned;
}

export function buildReviewSummary(text: string, brand: string | null = null, model: string | null = null): string | null {
  const compacted = compactSummary(cleanReviewTextForSummary(text, brand, model));
  if (!compacted) return null;
  return compacted.length > 45 ? compacted.slice(0, 45).trim() : compacted;
}

export function inferReviewSourceType(username: string): ReviewSourceType {
  const u = username.toLowerCase().replace(/^@/, "");
  if (u === "winkwink_rent") return "shop";
  if (u === "unknown" || u === "") return "unknown";
  return "customer";
}

export function buildConfidence(post: {
  phone_brand?: string | null;
  phone_model?: string | null;
  lens_status?: LensStatus;
  video_quality?: string | null;
  hashtags?: string[];
  posted_at?: string | null;
}): number {
  let score = 0.5;
  if (post.phone_brand) score += 0.15;
  if (post.phone_model) score += 0.1;
  if (post.lens_status && post.lens_status !== "unknown") score += 0.1;
  if (post.video_quality) score += 0.05;
  if (post.hashtags && post.hashtags.length > 0) score += 0.05;
  if (post.posted_at) score += 0.05;
  return Math.min(score, 1.0);
}

// ─── Combined text parser ──────────────────────────────────────

export interface ParsedReviewFields {
  phone_brand: string | null;
  phone_model: string | null;
  phone_slug: string | null;
  lens_status: LensStatus;
  suggested_model: string | null;
  video_quality: string | null;
  year: number | null;
  hashtags: string[];
  app_used: string | null;
  summary_th: string | null;
  confidence: number;
}

/**
 * Run every text heuristic at once. `place` is intentionally left out —
 * it's too noisy to guess reliably, so the admin fills it in.
 */
export function parseReviewText(text: string, postedAt: string | null = null): ParsedReviewFields {
  const normalized = normalizePhoneModel({ texts: [text] });
  const { phone_brand: brand, phone_model: model, phone_slug: slug, lens_status, suggested_model } = normalized;
  const video_quality = extractVideoQuality(text);
  const year = extractYear(text, postedAt);
  const hashtags = extractHashtags(text);
  const app_used = extractAppUsed(text);

  const summary_th = buildReviewSummary(text, brand, model);

  const confidence = buildConfidence({
    phone_brand: brand,
    phone_model: model,
    lens_status,
    video_quality,
    hashtags,
    posted_at: postedAt,
  });

  return { phone_brand: brand, phone_model: model, phone_slug: slug, lens_status, suggested_model, video_quality, year, hashtags, app_used, summary_th, confidence };
}
