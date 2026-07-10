import { slugify } from "@/lib/utils/slugify";
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

/** Heuristic phone/lens extraction — expand this list for better coverage. */
const PHONE_PATTERNS: { brand: string; patterns: RegExp[] }[] = [
  { brand: "Oppo",    patterns: [/oppo\s+find\s+x(\d+)\s+(pro)?/i, /oppo\s+reno\s+(\d+)\s*(pro)?/i, /oppo\s+([\w\s]+)/i] },
  { brand: "Apple",   patterns: [/iphone\s+(\d+)\s*(pro\s*(max)?|plus|mini)?/i] },
  { brand: "Samsung", patterns: [/samsung\s+galaxy\s+(s\d+\s*(ultra|plus)?|a\d+)/i, /galaxy\s+(s\d+\s*(ultra|plus)?)/i] },
  { brand: "Xiaomi",  patterns: [/xiaomi\s+(\d+\s*(ultra|pro)?)/i] },
  { brand: "Vivo",    patterns: [/vivo\s+(x\d+\s*(pro)?)/i] },
  { brand: "Google",  patterns: [/pixel\s+(\d+\s*(pro\s*(fold|xl)?|a)?)/i] },
];

export function extractPhoneInfo(text: string): { brand: string | null; model: string | null; slug: string | null } {
  for (const { brand, patterns } of PHONE_PATTERNS) {
    for (const re of patterns) {
      const m = text.match(re);
      if (m) {
        const model = m[0].trim();
        return { brand, model, slug: slugify(`${brand}-${model}`) };
      }
    }
  }
  return { brand: null, model: null, slug: null };
}

export function extractLensStatus(text: string): LensStatus {
  if (/เลนส์เสริม|พร้อมเลนส์|with\s+lens|\+\s*lens/i.test(text)) return "yes";
  if (/ไม่(มี|เอา|ใช้)เลนส์|no\s+lens|without\s+lens/i.test(text)) return "no";
  if (/เลนส์|lens/i.test(text)) return "yes"; // mention without negation = probably yes
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
  const { brand, model, slug } = extractPhoneInfo(text);
  const lens_status = extractLensStatus(text);
  const video_quality = extractVideoQuality(text);
  const year = extractYear(text, postedAt);
  const hashtags = extractHashtags(text);
  const app_used = extractAppUsed(text);

  let summary_th: string | null = null;
  if (brand || model) {
    const name = [brand, model].filter(Boolean).join(" ");
    summary_th = `รีวิว${name}${lens_status === "yes" ? " พร้อมเลนส์เสริม" : ""}`;
  }

  const confidence = buildConfidence({
    phone_brand: brand,
    phone_model: model,
    lens_status,
    video_quality,
    hashtags,
    posted_at: postedAt,
  });

  return { phone_brand: brand, phone_model: model, phone_slug: slug, lens_status, video_quality, year, hashtags, app_used, summary_th, confidence };
}
