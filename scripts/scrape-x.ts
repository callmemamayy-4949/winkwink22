/**
 * scripts/scrape-x.ts
 * ─────────────────────────────────────────────────────────────
 * Winkwink Review Gallery — X/Twitter scraper (Phase 2, local-only)
 *
 * Runs on an admin's local machine via Playwright. Never runs on Vercel and
 * never runs from the public website — this file is not imported by any
 * Next.js route. It only ever reads public X search results in a real
 * browser window; it does not bypass login, CAPTCHA, or rate limits. If X
 * shows a login wall, CAPTCHA, or fails to load, the script stops and
 * prints a clear error instead of guessing.
 *
 * Output is JSON + CSV in exports/ — nothing touches Supabase directly.
 * An admin reviews the files, then uploads them at /admin/import, where
 * every row lands as status="pending" until approved.
 *
 * Usage:
 *   npm run scrape:x -- --keyword "#รีวิวเช่าwinkwink" --limit 20
 *   npm run scrape:x -- --keyword "@winkwink_rent" --limit 20 --headless
 *
 * First-time setup:
 *   npm install
 *   npm run scrape:x:install   (downloads the Chromium build Playwright needs)
 *
 * Output files:
 *   exports/x-reviews-YYYY-MM-DD.json
 *   exports/x-reviews-YYYY-MM-DD.csv
 * ─────────────────────────────────────────────────────────────
 */

import { chromium, type ElementHandle, type Page } from "playwright";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { rowsToCsv, type CsvColumn } from "../src/lib/utils/csv";
import {
  buildConfidence,
  extractHashtags,
  extractLensStatus,
  extractPhoneInfo,
  extractVideoQuality,
  extractYear,
  inferReviewSourceType,
  parseCount,
  parseTweetId,
} from "../src/lib/utils/parse-review";
import type { ImportRow } from "../src/types/review";

// ─── CLI args ──────────────────────────────────────────────────
const args = process.argv.slice(2);
function getArg(flag: string, fallback: string): string {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
}
const KEYWORD  = getArg("--keyword", "#รีวิวเช่าwinkwink");
const LIMIT    = parseInt(getArg("--limit", "20"), 10);
const HEADLESS = args.includes("--headless");
const SLOW_MO  = parseInt(getArg("--slowmo", "800"), 10); // ms between actions
// Persistent browser profile: you log into X once in the opened window and the
// session is remembered here for next time. This dir holds real session cookies.
// Default lives OUTSIDE the repo (and outside OneDrive) — a Chrome user-data-dir
// inside a synced/OneDrive folder causes file-lock "spawn UNKNOWN" launch errors.
const PROFILE_DIR = path.resolve(
  getArg("--profile", path.join(os.homedir(), ".winkwink-x-profile"))
);
// How long to wait for you to finish logging in manually (interactive runs only).
const LOGIN_WAIT_MS = parseInt(getArg("--login-timeout", "180000"), 10);
// Which browser binary to drive. Defaults to the system Microsoft Edge ("msedge"),
// which is always present on Windows and avoids Playwright's bundled-Chromium
// launch problems (antivirus / OneDrive file locks). Use "chrome" for system
// Chrome, or "chromium" / empty to force Playwright's bundled build.
const CHANNEL = getArg("--channel", "msedge").trim();

const LOGIN_WALL_MESSAGE =
  "ไม่สามารถดึงข้อมูลจาก X ได้ อาจเจอ login wall, CAPTCHA หรือหน้าโหลดไม่สำเร็จ กรุณาลองใหม่หรือใช้ Manual Add แทน";

// Text heuristics (extractHashtags, extractPhoneInfo, parseCount, …) are shared
// with /admin/manual-add and live in src/lib/utils/parse-review.ts.

// ─── X scraper ────────────────────────────────────────────────

async function checkForLoginWall(page: Page): Promise<boolean> {
  const url = page.url();
  if (url.includes("/i/flow/login") || url.includes("login")) return true;

  const loginSelectors = ['text="Sign in"', '[data-testid="loginButton"]', 'text="Log in to X"'];
  for (const sel of loginSelectors) {
    if (await page.locator(sel).first().isVisible({ timeout: 1000 }).catch(() => false)) {
      return true;
    }
  }
  return false;
}

/**
 * Interactive login: when a login wall appears and we're NOT headless, pause and
 * let the human log into X in the opened window with their own account, then
 * continue once tweets are visible. We never type credentials or touch a CAPTCHA
 * ourselves — this only waits for the user. Returns true once logged in.
 */
async function waitForManualLogin(page: Page): Promise<boolean> {
  console.log("\n🔐  X ต้องล็อกอินก่อนถึงจะดูผลการค้นหาได้");
  console.log("    → กรุณาล็อกอิน X ในหน้าต่างเบราว์เซอร์ที่เปิดอยู่ด้วยบัญชีของคุณเอง");
  console.log(`    → ระบบจะรอสูงสุด ${Math.round(LOGIN_WAIT_MS / 1000)} วินาที แล้วดำเนินการต่อให้อัตโนมัติ`);
  console.log("    (ล็อกอินครั้งเดียว — ครั้งต่อไปจะจำ session ไว้ในโปรไฟล์)\n");

  const deadline = Date.now() + LOGIN_WAIT_MS;
  while (Date.now() < deadline) {
    // Logged in when the search results (tweets) show up and no login wall remains.
    const hasTweet = await page
      .locator('[data-testid="tweet"]')
      .first()
      .isVisible({ timeout: 1000 })
      .catch(() => false);
    if (hasTweet) {
      console.log("✅  ตรวจพบว่าล็อกอินแล้ว — ดำเนินการต่อ\n");
      return true;
    }
    if (!(await checkForLoginWall(page))) {
      // Login wall gone but tweets not yet rendered — give the page a moment.
      await page.waitForTimeout(1500);
      const retry = await page
        .locator('[data-testid="tweet"]')
        .first()
        .isVisible({ timeout: 1000 })
        .catch(() => false);
      if (retry) {
        console.log("✅  ล็อกอินสำเร็จ — ดำเนินการต่อ\n");
        return true;
      }
    }
    await page.waitForTimeout(2500);
  }
  return false;
}

/** Best-effort media extraction: photo URLs from the DOM, and a video's poster frame as a thumbnail. */
async function extractMedia(
  tweetEl: ElementHandle<Element>
): Promise<{ mediaUrls: string[]; thumbnailUrl: string | null }> {
  const images = await tweetEl
    .$$eval('[data-testid="tweetPhoto"] img', (imgs) =>
      imgs.map((img) => (img as HTMLImageElement).src).filter(Boolean)
    )
    .catch(() => [] as string[]);

  const videoPoster = await tweetEl
    .$eval('[data-testid="videoPlayer"] video', (v) => (v as HTMLVideoElement).poster || null)
    .catch(() => null);

  return { mediaUrls: [...new Set(images)], thumbnailUrl: videoPoster };
}

async function scrapeTweet(tweetEl: ElementHandle<Element>): Promise<ImportRow | null> {
  try {
    const linkEl = await tweetEl.$('a[href*="/status/"]');
    const href = await linkEl?.getAttribute("href");
    if (!href) return null;
    const tweetId = parseTweetId(href);
    if (!tweetId) return null;
    const url = `https://x.com${href}`;

    const textEl = await tweetEl.$('[data-testid="tweetText"]');
    const text = ((await textEl?.textContent()) ?? "").trim();

    const nameEl = await tweetEl.$('[data-testid="User-Name"]');
    const nameText = (await nameEl?.textContent()) ?? "";
    const usernameMatch = nameText.match(/@([\w_]+)/);
    const username = usernameMatch ? `@${usernameMatch[1]}` : "@unknown";
    const displayName = nameText.replace(/@[\w_]+/, "").trim() || username;

    const timeEl = await tweetEl.$("time");
    const dateTime = (await timeEl?.getAttribute("datetime")) ?? null;

    const retweetEl    = await tweetEl.$('[data-testid="retweet"] span');
    const likeEl       = await tweetEl.$('[data-testid="like"] span');
    const replyEl      = await tweetEl.$('[data-testid="reply"] span');
    const analyticsEl  = await tweetEl.$('a[href$="/analytics"] span');

    const rtCount   = parseCount(await retweetEl?.textContent());
    const likeCount = parseCount(await likeEl?.textContent());
    const repCount  = parseCount(await replyEl?.textContent());
    const viewCount = parseCount(await analyticsEl?.textContent());

    const { mediaUrls, thumbnailUrl } = await extractMedia(tweetEl);

    const { brand, model, slug } = extractPhoneInfo(text);
    const hashtags   = extractHashtags(text);
    const lensStatus = extractLensStatus(text);
    const quality    = extractVideoQuality(text);
    const year       = extractYear(text, dateTime);
    const sourceType = inferReviewSourceType(username);

    const row: ImportRow = {
      original_url:       url,
      platform:           "x",
      tweet_id:            tweetId,
      username,
      display_name:        displayName,
      post_text:           text,
      media_urls:          mediaUrls,
      thumbnail_url:       thumbnailUrl,
      posted_at:           dateTime,
      source_keyword:      KEYWORD,
      hashtags,
      phone_brand:         brand,
      phone_model:         model,
      phone_slug:          slug,
      lens_status:         lensStatus,
      place:               null,
      place_slug:          null,
      video_quality:       quality,
      year,
      app_used:            null,
      summary_th:          null,
      review_source_type:  sourceType,
      retweet_count:       rtCount,
      like_count:          likeCount,
      reply_count:         repCount,
      view_count:          viewCount,
      status:              "pending",
      scraped_at:          new Date().toISOString(),
      confidence:          0,
    };
    row.confidence = buildConfidence(row);
    return row;
  } catch {
    return null;
  }
}

function toCsvRow(row: ImportRow): Record<CsvColumn, string> {
  return {
    original_url:       row.original_url,
    platform:            row.platform,
    tweet_id:            row.tweet_id ?? "",
    username:            row.username,
    display_name:        row.display_name ?? "",
    post_text:           row.post_text ?? "",
    media_urls:          (row.media_urls ?? []).join("|"),
    thumbnail_url:       row.thumbnail_url ?? "",
    preview_image_url:   row.preview_image_url ?? row.thumbnail_url ?? "",
    posted_at:           row.posted_at ?? "",
    source_keyword:      row.source_keyword ?? "",
    hashtags:            (row.hashtags ?? []).join("|"),
    phone_brand:         row.phone_brand ?? "",
    phone_model:         row.phone_model ?? "",
    phone_slug:          row.phone_slug ?? "",
    lens_status:         row.lens_status ?? "unknown",
    place:               row.place ?? "",
    place_slug:          row.place_slug ?? "",
    video_quality:       row.video_quality ?? "",
    year:                row.year != null ? String(row.year) : "",
    app_used:            row.app_used ?? "",
    summary_th:          row.summary_th ?? "",
    confidence:          row.confidence != null ? String(row.confidence) : "",
    retweet_count:       row.retweet_count != null ? String(row.retweet_count) : "",
    like_count:          row.like_count != null ? String(row.like_count) : "",
    reply_count:         row.reply_count != null ? String(row.reply_count) : "",
    view_count:          row.view_count != null ? String(row.view_count) : "",
    review_source_type:  row.review_source_type ?? "unknown",
    status:              "pending",
    scraped_at:          row.scraped_at ?? "",
  };
}

async function run() {
  console.log("╔══════════════════════════════════════╗");
  console.log("║  Winkwink X Scraper — Phase 2 (local) ║");
  console.log("╚══════════════════════════════════════╝");
  console.log(`Keyword: ${KEYWORD}  |  Limit: ${LIMIT}`);
  console.log(`Profile: ${PROFILE_DIR}`);
  console.log(`Browser: ${CHANNEL && CHANNEL !== "chromium" ? CHANNEL : "playwright chromium (bundled)"}`);
  console.log("");

  // Persistent context so your X login is remembered across runs. `channel`
  // (default "msedge") drives a system-installed browser; only omit it to use
  // Playwright's bundled Chromium.
  const useChannel = CHANNEL && CHANNEL !== "chromium" ? CHANNEL : undefined;
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: HEADLESS,
    slowMo: SLOW_MO,
    ...(useChannel ? { channel: useChannel } : {}),
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    locale: "th-TH",
    viewport: { width: 1280, height: 900 },
    args: ["--lang=th-TH"],
  });

  const page = context.pages()[0] ?? (await context.newPage());

  try {
    // ── Navigate to X search ──────────────────────────────────
    const searchUrl = `https://x.com/search?q=${encodeURIComponent(KEYWORD)}&src=typed_query&f=live`;
    console.log(`→ Navigating to: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });

    // ── Handle login wall ──────────────────────────────────────
    await page.waitForTimeout(3000);
    if (await checkForLoginWall(page)) {
      if (HEADLESS) {
        // No window to log into — can't proceed without bypassing anything.
        console.error(`\n⛔  ${LOGIN_WALL_MESSAGE}`);
        console.error("    รันแบบไม่ใส่ --headless เพื่อเปิดหน้าต่างให้ล็อกอิน X เองได้");
        await context.close();
        process.exit(1);
      }
      // Interactive: wait for the user to log in themselves.
      const loggedIn = await waitForManualLogin(page);
      if (!loggedIn) {
        console.error(`\n⛔  ${LOGIN_WALL_MESSAGE}`);
        console.error("    (หมดเวลารอล็อกอิน — ลองใหม่ หรือเพิ่มเวลาด้วย --login-timeout)");
        await context.close();
        process.exit(1);
      }
    }

    // ── Wait for tweets ────────────────────────────────────────
    console.log("⏳  Waiting for tweets to load...");
    try {
      await page.waitForSelector('[data-testid="tweet"]', { timeout: 15_000 });
    } catch {
      console.error(`\n⛔  ${LOGIN_WALL_MESSAGE}`);
      console.error("    (ไม่พบโพสต์ในหน้า — อาจเจอ login wall หรือ keyword ไม่มีผลลัพธ์)");
      await context.close();
      process.exit(1);
    }

    // ── Scroll & collect ──────────────────────────────────────
    const seen = new Set<string>();
    const results: ImportRow[] = [];

    console.log(`✅  Collecting up to ${LIMIT} tweets...\n`);

    let attempts = 0;
    while (results.length < LIMIT && attempts < 30) {
      attempts++;
      const tweets = await page.$$('[data-testid="tweet"]');

      for (const tweet of tweets) {
        if (results.length >= LIMIT) break;
        const row = await scrapeTweet(tweet);
        if (!row || !row.original_url) continue;
        if (seen.has(row.original_url)) continue;
        seen.add(row.original_url);
        results.push(row);
        console.log(`  [${results.length}/${LIMIT}] ${row.username} — ${(row.post_text ?? "").slice(0, 60)}...`);
      }

      if (results.length >= LIMIT) break;

      // Scroll down for more
      await page.evaluate(() => window.scrollBy(0, 1200));
      await page.waitForTimeout(2000);

      // Re-check for login wall after scroll
      if (await checkForLoginWall(page)) {
        console.error(`\n⛔  ${LOGIN_WALL_MESSAGE}`);
        break;
      }
    }

    if (results.length === 0) {
      console.error(`\n⛔  ${LOGIN_WALL_MESSAGE}`);
      await context.close();
      process.exit(1);
    }

    // ── Export ────────────────────────────────────────────────
    const dateStr    = new Date().toISOString().slice(0, 10);
    const exportsDir  = path.join(process.cwd(), "exports");
    fs.mkdirSync(exportsDir, { recursive: true });

    const jsonPath = path.join(exportsDir, `x-reviews-${dateStr}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2), "utf-8");

    const csvPath = path.join(exportsDir, `x-reviews-${dateStr}.csv`);
    fs.writeFileSync(csvPath, rowsToCsv(results.map(toCsvRow)), "utf-8");

    console.log(`\n✅  Done! Scraped ${results.length} posts.`);
    console.log(`📄  JSON: ${jsonPath}`);
    console.log(`📊  CSV:  ${csvPath}`);
    console.log(`\n👉  Next: upload one of these files at /admin/import`);
  } finally {
    await context.close();
  }
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
