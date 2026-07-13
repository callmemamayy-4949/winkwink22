import type { ImportRow } from "@/types/review";
import { normalizeReviewText } from "@/lib/utils/review-summary";

/**
 * Column order used by both the CSV export in scripts/scrape-x.ts and the
 * CSV import in /admin/import, so the two stay in sync automatically.
 */
export const CSV_COLUMNS = [
  "original_url", "platform", "tweet_id", "username", "display_name", "post_text", "caption",
  "media_urls", "thumbnail_url", "preview_image_url", "posted_at", "source_keyword", "hashtags",
  "phone_brand", "phone_model", "phone_slug", "lens_status", "suggested_model", "model_hint", "model_match_status", "place", "place_slug",
  "video_quality", "year", "app_used", "summary_th", "confidence",
  "retweet_count", "like_count", "reply_count", "view_count",
  "review_source_type", "status", "scraped_at",
] as const;

export type CsvColumn = (typeof CSV_COLUMNS)[number];

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/** Serialize rows to CSV text. Every field is quoted, so any comma/newline in Thai text is safe. */
export function rowsToCsv(rows: Record<CsvColumn, string>[]): string {
  const header = CSV_COLUMNS.join(",");
  const lines = rows.map((row) => CSV_COLUMNS.map((col) => csvEscape(row[col] ?? "")).join(","));
  return [header, ...lines].join("\n");
}

/**
 * Generic CSV parser (RFC4180-ish): quoted fields, "" escapes, and commas /
 * newlines inside quotes are treated as literal characters, not separators.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      continue;
    }
    if (char === "\r") continue;
    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }
    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ""));
}

function toNullableString(v: string | undefined): string | null {
  const trimmed = normalizeReviewText(v);
  return trimmed === "" ? null : trimmed;
}

function toNumber(v: string | undefined): number | null {
  const trimmed = (v ?? "").trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function toArray(v: string | undefined): string[] {
  const trimmed = (v ?? "").trim();
  return trimmed === "" ? [] : trimmed.split("|").map((s) => s.trim()).filter(Boolean);
}

function toModelMatchStatus(v: string | undefined): ImportRow["model_match_status"] {
  const value = toNullableString(v);
  return value === "canonical" || value === "suggested" || value === "unknown" ? value : undefined;
}

/** Convert a parsed CSV table (first row = header) into ImportRow objects, matching by column name. */
export function csvTableToImportRows(table: string[][]): ImportRow[] {
  if (table.length === 0) return [];
  const [header, ...dataRows] = table;
  const colIndex = new Map(header.map((h, i) => [h.trim(), i]));
  const get = (row: string[], col: string) => row[colIndex.get(col) ?? -1];
  const getFirst = (row: string[], cols: string[]) => {
    for (const col of cols) {
      const value = get(row, col);
      if (value !== undefined) return value;
    }
    return undefined;
  };

  return dataRows
    .filter((row) => row.some((cell) => cell.trim() !== ""))
    .map((row) => ({
      original_url: (get(row, "original_url") ?? "").trim(),
      platform: (get(row, "platform") ?? "").trim() as ImportRow["platform"],
      tweet_id: toNullableString(get(row, "tweet_id")),
      username: (get(row, "username") ?? "").trim(),
      display_name: toNullableString(get(row, "display_name")),
      post_text: toNullableString(get(row, "post_text")),
      caption: toNullableString(get(row, "caption")),
      model_hint: toNullableString(getFirst(row, ["model_hint", "import_note"])) ?? toNullableString(get(row, "caption")),
      media_urls: toArray(getFirst(row, ["media_urls", "media_url"])),
      thumbnail_url: toNullableString(get(row, "thumbnail_url")),
      preview_image_url: toNullableString(get(row, "preview_image_url")),
      posted_at: toNullableString(get(row, "posted_at")),
      source_keyword: toNullableString(get(row, "source_keyword")),
      hashtags: toArray(get(row, "hashtags")),
      phone_brand: toNullableString(get(row, "phone_brand")),
      phone_model: toNullableString(get(row, "phone_model")),
      phone_slug: toNullableString(get(row, "phone_slug")),
      lens_status: (toNullableString(get(row, "lens_status")) ?? "unknown") as ImportRow["lens_status"],
      suggested_model: toNullableString(getFirst(row, ["suggested_model", "candidate_model"])),
      model_match_status: toModelMatchStatus(get(row, "model_match_status")),
      place: toNullableString(get(row, "place")),
      place_slug: toNullableString(get(row, "place_slug")),
      video_quality: toNullableString(get(row, "video_quality")),
      year: toNumber(get(row, "year")),
      app_used: toNullableString(get(row, "app_used")),
      summary_th: toNullableString(get(row, "summary_th")),
      confidence: toNumber(get(row, "confidence")),
      retweet_count: toNumber(get(row, "retweet_count")),
      like_count: toNumber(get(row, "like_count")),
      reply_count: toNumber(get(row, "reply_count")),
      view_count: toNumber(get(row, "view_count")),
      review_source_type: (toNullableString(get(row, "review_source_type")) ?? "unknown") as ImportRow["review_source_type"],
      scraped_at: toNullableString(get(row, "scraped_at")),
    }));
}
