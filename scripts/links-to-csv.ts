/**
 * scripts/links-to-csv.ts
 * ─────────────────────────────────────────────────────────────
 * Winkwink Review Gallery — turn a list of X/TikTok links into a
 * ready-to-import CSV/JSON, entirely from official public data.
 *
 * This is the replacement for the Playwright scraper for X: X now hard-blocks
 * automated logins, and we do NOT bypass that. Instead you collect the post
 * links yourself (however you normally browse), drop them in a text file, and
 * this script resolves each one through the OFFICIAL oEmbed API — no browser,
 * no login, no automation, nothing to bypass.
 *
 * Usage:
 *   1. Put one link per line in  links.txt  (lines starting with # are ignored)
 *   2. npm run links:csv
 *      # or point at another file / pass links inline:
 *      npm run links:csv -- --file my-links.txt
 *      npm run links:csv -- https://x.com/user/status/123 https://x.com/u/status/456
 *
 * Output (a local "backend" record you keep on disk):
 *   exports/x-reviews-YYYY-MM-DD.json
 *   exports/x-reviews-YYYY-MM-DD.csv
 *
 * Then upload either file at /admin/import → everything lands as pending → you
 * review & approve at /admin/pending before it shows on the public site.
 * ─────────────────────────────────────────────────────────────
 */

import * as fs from "fs";
import * as path from "path";
import { rowsToCsv, type CsvColumn } from "../src/lib/utils/csv";
import { fetchPostPreview } from "../src/lib/utils/oembed";
import { parsePostUrl } from "../src/lib/utils/parse-review";
import { buildImportRow } from "../src/lib/utils/link-to-row";
import type { ImportRow } from "../src/types/review";

// ─── CLI args ──────────────────────────────────────────────────
const argv = process.argv.slice(2);
function getArg(flag: string, fallback: string): string {
  const i = argv.indexOf(flag);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : fallback;
}
const FILE = getArg("--file", "links.txt");
const DELAY_MS = parseInt(getArg("--delay", "600"), 10); // polite gap between requests

// Links can come from the file and/or as bare positional args.
function collectLinks(): string[] {
  const inline = argv.filter((a) => /^https?:\/\//i.test(a));
  let fromFile: string[] = [];
  const filePath = path.resolve(FILE);
  if (fs.existsSync(filePath)) {
    fromFile = fs
      .readFileSync(filePath, "utf-8")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"));
  }
  return [...fromFile, ...inline];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function toCsvRow(row: ImportRow): Record<CsvColumn, string> {
  return {
    original_url:       row.original_url,
    platform:            row.platform,
    tweet_id:            row.tweet_id ?? "",
    username:            row.username,
    display_name:        row.display_name ?? "",
    post_text:           row.post_text ?? "",
    caption:             row.caption ?? "",
    media_urls:          (row.media_urls ?? []).join("|"),
    thumbnail_url:       row.thumbnail_url ?? "",
    preview_image_url:   row.preview_image_url ?? "",
    posted_at:           row.posted_at ?? "",
    source_keyword:      row.source_keyword ?? "",
    hashtags:            (row.hashtags ?? []).join("|"),
    phone_brand:         row.phone_brand ?? "",
    phone_model:         row.phone_model ?? "",
    phone_slug:          row.phone_slug ?? "",
    lens_status:         row.lens_status ?? "unknown",
    suggested_model:     row.suggested_model ?? "",
    model_hint:          row.model_hint ?? "",
    model_match_status:  row.model_match_status ?? "unknown",
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

async function resolveLink(rawUrl: string): Promise<ImportRow | null> {
  const parsed = parsePostUrl(rawUrl);
  if (!parsed) {
    console.warn(`  ⚠️  ข้ามลิงก์ (ไม่ใช่ X/TikTok): ${rawUrl}`);
    return null;
  }

  const fetched = await fetchPostPreview(parsed.original_url, parsed.platform);
  const row = buildImportRow(parsed, fetched);

  const img = row.preview_image_url ? " 🖼️" : "";
  const tag = fetched.ok ? "✅" : "◻️ (ดึงข้อความไม่ได้ — เก็บลิงก์ไว้)";
  console.log(`  ${tag}${img}  ${row.username} — ${(row.post_text || parsed.original_url).slice(0, 55)}`);
  return row;
}

async function run() {
  console.log("╔══════════════════════════════════════╗");
  console.log("║  Winkwink Links → CSV (official oEmbed) ║");
  console.log("╚══════════════════════════════════════╝\n");

  const links = collectLinks();
  if (links.length === 0) {
    console.error(`⛔  ไม่พบลิงก์เลย`);
    console.error(`    ใส่ลิงก์ (บรรทัดละ 1 อัน) ในไฟล์ "${FILE}" แล้วรันใหม่`);
    console.error(`    หรือ: npm run links:csv -- https://x.com/user/status/123`);
    process.exit(1);
  }

  // De-dupe within this batch by normalised original_url.
  const seen = new Set<string>();
  const results: ImportRow[] = [];
  let skipped = 0;

  console.log(`พบ ${links.length} ลิงก์ — เริ่มดึงข้อมูล...\n`);

  for (let i = 0; i < links.length; i++) {
    process.stdout.write(`[${i + 1}/${links.length}] `);
    const row = await resolveLink(links[i]);
    if (!row) {
      skipped++;
      continue;
    }
    if (seen.has(row.original_url)) {
      console.log(`      ↳ ซ้ำในไฟล์ ข้าม`);
      skipped++;
      continue;
    }
    seen.add(row.original_url);
    results.push(row);
    if (i < links.length - 1) await sleep(DELAY_MS);
  }

  if (results.length === 0) {
    console.error(`\n⛔  ไม่ได้ข้อมูลที่ใช้ได้เลย`);
    process.exit(1);
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  const exportsDir = path.join(process.cwd(), "exports");
  fs.mkdirSync(exportsDir, { recursive: true });

  const jsonPath = path.join(exportsDir, `x-reviews-${dateStr}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2), "utf-8");

  const csvPath = path.join(exportsDir, `x-reviews-${dateStr}.csv`);
  fs.writeFileSync(csvPath, rowsToCsv(results.map(toCsvRow)), "utf-8");

  console.log(`\n✅  เสร็จ! ได้ ${results.length} รายการ (ข้าม ${skipped})`);
  console.log(`📄  JSON: ${jsonPath}`);
  console.log(`📊  CSV:  ${csvPath}`);
  console.log(`\n👉  ต่อไป: อัปโหลดไฟล์ใดไฟล์หนึ่งที่หน้า /admin/import`);
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
