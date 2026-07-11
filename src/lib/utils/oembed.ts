import type { Platform } from "@/types/review";

/**
 * Post text/author/thumbnail via the OFFICIAL public oEmbed endpoints
 * (X's publish.twitter.com, TikTok's tiktok.com/oembed). This is not scraping
 * and does not bypass login — it's the sanctioned embed API. The caller's URL
 * is only ever a query parameter to a fixed, trusted host, so there is no SSRF
 * surface. X's oEmbed can 404 for some posts, so callers must treat failure as
 * normal. Framework-agnostic (no next/* imports) so both the server action in
 * src/lib/actions/reviews.ts and the local scripts/links-to-csv.ts can use it.
 */
export interface FetchedPost {
  ok: boolean;
  post_text?: string;
  display_name?: string;
  posted_at?: string;
  thumbnail_url?: string;
  /** A real, directly-renderable preview image (photo, or a video's poster). */
  preview_image_url?: string;
  /** All real image URLs found on the post (photos / video posters). */
  media_urls?: string[];
  retweet_count?: number | null;
  like_count?: number | null;
  reply_count?: number | null;
  view_count?: number | null;
  reason?: string;
}

function decodeEntities(s: string): string {
  return s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

/** Pull the tweet body out of the oEmbed blockquote HTML. */
function stripTweetHtml(html: string): string {
  const pMatch = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  return decodeEntities(pMatch ? pMatch[1] : "");
}

function parseCompactCount(text: string | null | undefined): number | null {
  if (!text) return null;
  const clean = text.replace(/,/g, "").trim();
  const m = clean.match(/^(\d+(?:\.\d+)?)\s*([KMB])?/i);
  if (!m) return null;
  const value = Number(m[1]);
  if (!Number.isFinite(value)) return null;
  const suffix = (m[2] ?? "").toUpperCase();
  if (suffix === "K") return Math.round(value * 1_000);
  if (suffix === "M") return Math.round(value * 1_000_000);
  if (suffix === "B") return Math.round(value * 1_000_000_000);
  return Math.round(value);
}

function normalizeIsoDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

const MONTHS: Record<string, string> = {
  jan: "01",
  january: "01",
  feb: "02",
  february: "02",
  mar: "03",
  march: "03",
  apr: "04",
  april: "04",
  may: "05",
  jun: "06",
  june: "06",
  jul: "07",
  july: "07",
  aug: "08",
  august: "08",
  sep: "09",
  sept: "09",
  september: "09",
  oct: "10",
  october: "10",
  nov: "11",
  november: "11",
  dec: "12",
  december: "12",
};

function parseDisplayedTweetDate(text: string): string | null {
  const m = text.match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*[·•]\s*([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/i);
  if (!m) return null;
  let hour = Number(m[1]);
  const minute = m[2];
  const meridiem = m[3].toUpperCase();
  const month = MONTHS[m[4].toLowerCase()];
  const day = m[5].padStart(2, "0");
  const year = m[6];
  if (!month || !Number.isFinite(hour)) return null;
  if (meridiem === "PM" && hour < 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;
  return `${year}-${month}-${day}T${String(hour).padStart(2, "0")}:${minute}:00`;
}

function parseViews(text: string): number | null {
  const m = text.match(/([\d,.]+(?:\.\d+)?\s*[KMB]?)\s+Views?/i);
  return m ? parseCompactCount(m[1]) : null;
}

function firstNumberFromUnknown(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") return parseCompactCount(value);
  return null;
}

/**
 * Twitter/X syndication endpoint — the same public JSON the official embed
 * widget (and Vercel's react-tweet) calls to render a tweet. No login, no
 * automation; it returns the post text, author, and REAL media image URLs
 * (photos, and a video's poster frame). The `token` is derived from the id the
 * same way the widget does. Returns null on any failure so callers fall back.
 */
function syndicationToken(id: string): string {
  return ((Number(id) / 1e15) * Math.PI)
    .toString(6 ** 2)
    .replace(/(0+|\.)/g, "");
}

async function fetchXSyndication(
  tweetId: string
): Promise<{
  text: string;
  name: string;
  media_urls: string[];
  posted_at: string | null;
  retweet_count: number | null;
  like_count: number | null;
  reply_count: number | null;
  view_count: number | null;
} | null> {
  try {
    const endpoint =
      `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}` +
      `&token=${syndicationToken(tweetId)}&lang=en`;
    const res = await fetch(endpoint, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; WinkwinkGallery/1.0)" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      text?: string;
      created_at?: string;
      user?: { name?: string };
      mediaDetails?: { media_url_https?: string }[];
      photos?: { url?: string }[];
      favorite_count?: number;
      conversation_count?: number;
      retweet_count?: number;
      views?: string | number | { count?: string | number };
      view_count?: string | number;
    };

    const media = (data.mediaDetails ?? [])
      .map((m) => m.media_url_https)
      .filter((u): u is string => !!u);
    const photos = (data.photos ?? []).map((p) => p.url).filter((u): u is string => !!u);
    const media_urls = [...new Set([...media, ...photos])];

    const views =
      typeof data.views === "object"
        ? firstNumberFromUnknown(data.views.count)
        : firstNumberFromUnknown(data.views);

    return {
      text: (data.text ?? "").trim(),
      name: (data.user?.name ?? "").trim(),
      media_urls,
      posted_at: normalizeIsoDate(data.created_at),
      retweet_count: firstNumberFromUnknown(data.retweet_count),
      like_count: firstNumberFromUnknown(data.favorite_count),
      reply_count: firstNumberFromUnknown(data.conversation_count),
      view_count: views ?? firstNumberFromUnknown(data.view_count),
    };
  } catch {
    return null;
  }
}

async function fetchXTweetDetailPage(url: string): Promise<Partial<FetchedPost>> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return {};
    const html = await res.text();
    const decoded = decodeEntities(html);
    const datetime =
      html.match(/<time[^>]+datetime=["']([^"']+)["']/i)?.[1] ??
      html.match(/"created_at"\s*:\s*"([^"]+)"/i)?.[1] ??
      null;
    const displayedDate = parseDisplayedTweetDate(decoded);
    return {
      posted_at: normalizeIsoDate(datetime) ?? displayedDate ?? undefined,
      view_count: parseViews(decoded),
    };
  } catch {
    return {};
  }
}

/**
 * Best-effort post preview: text + author + a real preview image.
 * X → syndication (gives images) with oEmbed as text fallback.
 * TikTok → oEmbed (its thumbnail_url is a real preview image).
 */
export async function fetchPostPreview(url: string, platform: Platform): Promise<FetchedPost> {
  const target = url?.trim();
  if (!target) return { ok: false, reason: "ไม่มีลิงก์" };

  if (platform === "x") {
    const id = target.match(/status\/(\d+)/)?.[1];
    const detail = await fetchXTweetDetailPage(target);
    if (id) {
      const syn = await fetchXSyndication(id);
      if (syn && (syn.text || syn.media_urls.length > 0)) {
        return {
          ok: true,
          post_text: syn.text,
          display_name: syn.name,
          posted_at: syn.posted_at ?? detail.posted_at,
          preview_image_url: syn.media_urls[0],
          media_urls: syn.media_urls,
          retweet_count: syn.retweet_count,
          like_count: syn.like_count,
          reply_count: syn.reply_count,
          view_count: syn.view_count ?? detail.view_count ?? null,
        };
      }
    }
    // Fallback: oEmbed gives text only (no image).
    const fallback = await fetchPostViaOembed(target, "x");
    return {
      ...fallback,
      posted_at: fallback.posted_at ?? detail.posted_at,
      view_count: fallback.view_count ?? detail.view_count ?? null,
      ok: fallback.ok || !!detail.posted_at || detail.view_count != null,
      reason: fallback.ok ? fallback.reason : detail.posted_at || detail.view_count != null ? undefined : fallback.reason,
    };
  }

  // TikTok: oEmbed returns a real thumbnail.
  const o = await fetchPostViaOembed(target, "tiktok");
  return {
    ...o,
    preview_image_url: o.thumbnail_url,
    media_urls: o.thumbnail_url ? [o.thumbnail_url] : [],
  };
}

export async function fetchPostViaOembed(url: string, platform: Platform): Promise<FetchedPost> {
  const target = url?.trim();
  if (!target) return { ok: false, reason: "ไม่มีลิงก์" };

  try {
    const endpoint =
      platform === "tiktok"
        ? `https://www.tiktok.com/oembed?url=${encodeURIComponent(target)}`
        : `https://publish.twitter.com/oembed?omit_script=1&dnt=1&url=${encodeURIComponent(target)}`;

    const res = await fetch(endpoint, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; WinkwinkGallery/1.0)" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { ok: false, reason: `oEmbed HTTP ${res.status}` };

    const data = (await res.json()) as {
      html?: string;
      title?: string;
      author_name?: string;
      thumbnail_url?: string;
    };

    if (platform === "tiktok") {
      const text = (data.title ?? "").trim();
      return {
        ok: !!text,
        post_text: text,
        display_name: data.author_name ?? "",
        thumbnail_url: data.thumbnail_url,
        reason: text ? undefined : "empty",
      };
    }

    const text = stripTweetHtml(data.html ?? "");
    return {
      ok: !!text,
      post_text: text,
      display_name: data.author_name ?? "",
      reason: text ? undefined : "empty",
    };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "fetch failed" };
  }
}
