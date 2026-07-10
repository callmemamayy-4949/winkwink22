"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { importReviews, type ImportSummary } from "@/lib/actions/reviews";
import { parseCsv, csvTableToImportRows } from "@/lib/utils/csv";
import type { ImportRow } from "@/types/review";

const LENS_VALUES = new Set(["yes", "no", "unknown"]);
const SOURCE_VALUES = new Set(["customer", "shop", "unknown"]);

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}
function arr(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}
function mediaArr(v: unknown): string[] {
  if (typeof v === "string" && v.trim() !== "") return [v.trim()];
  return arr(v);
}
function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
}

/** Loosely-typed JSON → ImportRow, defensive against a hand-edited export file. */
function normalizeJsonRow(raw: unknown): ImportRow | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  return {
    original_url: str(r.original_url) ?? "",
    platform: (r.platform === "x" || r.platform === "tiktok" ? r.platform : "") as ImportRow["platform"],
    tweet_id: str(r.tweet_id),
    username: str(r.username) ?? "",
    display_name: str(r.display_name),
    post_text: str(r.post_text),
    media_urls: arr(r.media_urls).length > 0 ? arr(r.media_urls) : mediaArr(r.media_url),
    thumbnail_url: str(r.thumbnail_url),
    preview_image_url: str(r.preview_image_url),
    posted_at: str(r.posted_at),
    source_keyword: str(r.source_keyword),
    hashtags: arr(r.hashtags),
    phone_brand: str(r.phone_brand),
    phone_model: str(r.phone_model),
    phone_slug: str(r.phone_slug),
    lens_status: (LENS_VALUES.has(r.lens_status as string) ? r.lens_status : "unknown") as ImportRow["lens_status"],
    place: str(r.place),
    place_slug: str(r.place_slug),
    video_quality: str(r.video_quality),
    year: num(r.year),
    app_used: str(r.app_used),
    summary_th: str(r.summary_th),
    confidence: num(r.confidence),
    retweet_count: num(r.retweet_count),
    like_count: num(r.like_count),
    reply_count: num(r.reply_count),
    view_count: num(r.view_count),
    review_source_type: (SOURCE_VALUES.has(r.review_source_type as string)
      ? r.review_source_type
      : "unknown") as ImportRow["review_source_type"],
    scraped_at: str(r.scraped_at),
  };
}

async function parseFile(file: File): Promise<ImportRow[]> {
  const text = await file.text();
  const isCsv = file.name.toLowerCase().endsWith(".csv");

  if (isCsv) {
    return csvTableToImportRows(parseCsv(text));
  }

  const parsed: unknown = JSON.parse(text);
  if (!Array.isArray(parsed)) {
    throw new Error("ไฟล์ JSON ต้องเป็น array ของโพสต์ เช่น [ { ... }, { ... } ]");
  }
  return parsed.map(normalizeJsonRow).filter((r): r is ImportRow => r !== null);
}

export default function AdminImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);
    setSummary(null);
    setLoading(true);

    try {
      const rows = await parseFile(file);
      if (rows.length === 0) {
        setError("ไม่พบข้อมูลในไฟล์ หรือรูปแบบไฟล์ไม่ถูกต้อง");
        return;
      }
      const result = await importReviews(rows);
      setSummary(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "อ่านไฟล์ไม่สำเร็จ");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-primary">นำเข้ารีวิวจากไฟล์</h1>
        <p className="mt-1 text-sm text-label">
          อัปโหลดไฟล์ JSON หรือ CSV ที่ได้จาก <code>npm run scrape:x</code> (โฟลเดอร์ <code>exports/</code>)
        </p>
      </div>

      <div className="rounded-card border border-pastel-mint-text/20 bg-pastel-mint p-4 text-sm text-pastel-mint-text">
        <ul className="space-y-1 text-xs">
          <li>• ทุกรายการที่นำเข้าจะถูกบันทึกเป็น <code>status = pending</code> เสมอ</li>
          <li>• ระบบตรวจ <code>original_url</code> ซ้ำกับข้อมูลเดิมใน Supabase อัตโนมัติ</li>
          <li>• หลังนำเข้าแล้ว ต้องไปตรวจและ Approve ที่ <Link href="/admin/pending" className="underline font-semibold">/admin/pending</Link> ก่อนขึ้นหน้าเว็บจริง</li>
        </ul>
      </div>

      <div className="rounded-card bg-white p-5 shadow-card">
        <h2 className="mb-4 text-sm font-bold text-text-strong">📤 เลือกไฟล์</h2>

        <label
          htmlFor="import-file"
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-control border-2 border-dashed border-outline/40 bg-surface-cream px-4 py-10 text-center transition-colors hover:border-primary/50"
        >
          <span className="text-3xl">📄</span>
          <span className="text-sm font-semibold text-text-strong">
            {fileName ?? "คลิกเพื่อเลือกไฟล์ .json หรือ .csv"}
          </span>
          <span className="text-xs text-label">ไฟล์ที่ export จาก scripts/scrape-x.ts</span>
        </label>
        <input
          ref={fileInputRef}
          id="import-file"
          type="file"
          accept=".json,.csv"
          onChange={handleFileChange}
          disabled={loading}
          className="sr-only"
        />

        {loading && (
          <p className="mt-4 text-center text-sm font-semibold text-label">⏳ กำลังนำเข้า...</p>
        )}

        {error && (
          <div className="mt-4 rounded-control border border-error/30 bg-error/10 p-3 text-sm text-error">
            ⛔ {error}
          </div>
        )}
      </div>

      {summary && (
        <div className="rounded-card bg-white p-5 shadow-card">
          <h2 className="mb-4 text-sm font-bold text-text-strong">📊 สรุปผลการนำเข้า</h2>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "ทั้งหมดในไฟล์", value: summary.total, cls: "bg-surface-container text-text-strong" },
              { label: "เพิ่มใหม่", value: summary.inserted, cls: "bg-pastel-mint text-pastel-mint-text" },
              { label: "ซ้ำ (ข้าม)", value: summary.duplicate, cls: "bg-pastel-purple text-pastel-purple-text" },
              { label: "Scrape สำเร็จ", value: summary.scrapeSuccess, cls: "bg-pastel-mint text-pastel-mint-text" },
              { label: "Scrape ไม่สำเร็จ", value: summary.scrapeFailed, cls: "bg-pastel-yellow text-pastel-yellow-text" },
              { label: "ไม่สำเร็จ", value: summary.failed, cls: "bg-pastel-yellow text-pastel-yellow-text" },
            ].map((s) => (
              <div key={s.label} className={`rounded-control p-3 text-center ${s.cls}`}>
                <p className="text-2xl font-extrabold">{s.value}</p>
                <p className="text-xs font-semibold">{s.label}</p>
              </div>
            ))}
          </div>

          {summary.errors.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold text-label">รายละเอียด error</p>
              <ul className="max-h-48 space-y-1 overflow-y-auto rounded-control bg-surface-cream p-3 text-xs text-text">
                {summary.errors.map((e) => (
                  <li key={e.row}>
                    แถวที่ {e.row}: {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {summary.rowLogs.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold text-label">Log รายแถว</p>
              <ul className="max-h-64 space-y-1 overflow-y-auto rounded-control bg-surface-cream p-3 text-xs text-text">
                {summary.rowLogs.map((log, index) => (
                  <li key={`${log.row}-${log.status}-${index}`} className="break-all">
                    แถวที่ {log.row}: <span className="font-semibold">{log.status}</span>
                    {log.original_url ? ` · ${log.original_url}` : ""} · {log.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {summary.inserted > 0 && (
            <Link
              href="/admin/pending"
              className="mt-5 block w-full rounded-full bg-primary py-3 text-center text-sm font-semibold text-on-primary transition-transform hover:scale-[1.01] active:scale-95"
            >
              ไปตรวจโพสต์ pending →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
