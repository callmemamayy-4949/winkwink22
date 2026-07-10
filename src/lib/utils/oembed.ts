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
  thumbnail_url?: string;
  /** A real, directly-renderable preview image (photo, or a video's poster). */
  preview_image_url?: string;
  /** All real image URLs found on the post (photos / video posters). */
  media_urls?: string[];
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
): Promise<{ text: string; name: string; media_urls: string[] } | null> {
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
      user?: { name?: string };
      mediaDetails?: { media_url_https?: string }[];
      photos?: { url?: string }[];
    };

    const media = (data.mediaDetails ?? [])
      .map((m) => m.media_url_https)
      .filter((u): u is string => !!u);
    const photos = (data.photos ?? []).map((p) => p.url).filter((u): u is string => !!u);
    const media_urls = [...new Set([...media, ...photos])];

    return { text: (data.text ?? "").trim(), name: (data.user?.name ?? "").trim(), media_urls };
  } catch {
    return null;
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
    if (id) {
      const syn = await fetchXSyndication(id);
      if (syn && (syn.text || syn.media_urls.length > 0)) {
        return {
          ok: true,
          post_text: syn.text,
          display_name: syn.name,
          preview_image_url: syn.media_urls[0],
          media_urls: syn.media_urls,
        };
      }
    }
    // Fallback: oEmbed gives text only (no image).
    return fetchPostViaOembed(target, "x");
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
