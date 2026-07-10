"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PLATFORM_LABELS, LENS_LABELS_TH, SOURCE_LABELS_TH, type ImportRow } from "@/types/review";
import { previewLinks, importReviews, type LinkPreview, type ImportSummary } from "@/lib/actions/reviews";

/** Split a blob of pasted text into candidate links (comma / newline / spaces). */
function splitLinks(text: string): string[] {
  return text
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\//i.test(s));
}

type Item = LinkPreview & { key: string; dupInBatch: boolean };

export default function ManualAddPage() {
  const [step, setStep] = useState<"input" | "review" | "done">("input");
  const [linksText, setLinksText] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }

  const counts = useMemo(() => {
    const ready = items.filter((i) => i.ok && i.row && !i.existsInDb && !i.dupInBatch).length;
    const dup = items.filter((i) => i.existsInDb || i.dupInBatch).length;
    const bad = items.filter((i) => !i.ok).length;
    return { ready, dup, bad };
  }, [items]);

  async function handlePreview() {
    const urls = splitLinks(linksText);
    if (urls.length === 0) {
      showToast("error", "วางลิงก์ X หรือ TikTok อย่างน้อย 1 ลิงก์");
      return;
    }
    setLoading(true);
    const previews = await previewLinks(urls);
    setLoading(false);

    // Mark in-batch duplicates (same original_url appearing more than once).
    const seen = new Set<string>();
    const withDup: Item[] = previews.map((p, idx) => {
      const url = p.row?.original_url;
      const dupInBatch = !!url && seen.has(url);
      if (url) seen.add(url);
      return { ...p, key: `${idx}-${url ?? p.input}`, dupInBatch };
    });
    setItems(withDup);
    setStep("review");
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }

  async function save(onlyNonDup: boolean) {
    const rows: ImportRow[] = items
      .filter((i) => i.ok && i.row)
      .filter((i) => (onlyNonDup ? !i.existsInDb && !i.dupInBatch : true))
      .map((i) => i.row as ImportRow);

    if (rows.length === 0) {
      showToast("error", "ไม่มีรายการที่จะบันทึก");
      return;
    }
    setLoading(true);
    try {
      const result = await importReviews(rows);
      setSummary(result);
      setStep("done");
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setLinksText("");
    setItems([]);
    setSummary(null);
    setStep("input");
  }

  return (
    <div className="mx-auto max-w-4xl">
      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-card-hover ${
            toast.type === "success" ? "bg-pastel-mint-text" : "bg-error"
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-gradient-primary">เพิ่มรีวิวจากลิงก์</h1>
        <p className="mt-1 text-sm text-label">
          วางลิงก์ X/TikTok หนึ่งลิงก์หรือหลายลิงก์พร้อมกัน ระบบจะดึงรูป+ข้อมูลให้อัตโนมัติ
        </p>
      </div>

      {/* ── Step 1: paste links ── */}
      {step === "input" && (
        <section className="rounded-card border border-white/60 bg-white/80 p-5 shadow-card backdrop-blur">
          <label className="mb-1 block text-sm font-bold text-text-strong">
            🔗 วางลิงก์ X/TikTok หนึ่งลิงก์หรือหลายลิงก์
          </label>
          <p className="mb-3 text-xs text-label">รองรับการวางหลายลิงก์ คั่นด้วย comma หรือขึ้นบรรทัดใหม่</p>
          <textarea
            value={linksText}
            onChange={(e) => setLinksText(e.target.value)}
            rows={6}
            placeholder={"https://x.com/user/status/123\nhttps://x.com/another/status/456\nhttps://www.tiktok.com/@u/video/789"}
            className="w-full rounded-control border border-outline/40 bg-surface-cream px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-label">พบ {splitLinks(linksText).length} ลิงก์</span>
            <button
              type="button"
              onClick={handlePreview}
              disabled={loading}
              className="font-display rounded-full bg-gradient-primary px-6 py-2.5 text-sm font-semibold text-on-primary shadow-glow transition-transform hover:scale-[1.03] active:scale-95 disabled:opacity-60"
            >
              {loading ? "กำลังดึงข้อมูล..." : "ดึงข้อมูลจากลิงก์"}
            </button>
          </div>
        </section>
      )}

      {/* ── Step 2: preview cards ── */}
      {step === "review" && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2 rounded-card border border-white/60 bg-white/70 p-3 text-sm shadow-card backdrop-blur">
            <span className="font-semibold text-text-strong">{items.length} รายการ</span>
            <span className="rounded-full bg-pastel-mint px-2.5 py-0.5 text-xs font-semibold text-pastel-mint-text">พร้อมบันทึก {counts.ready}</span>
            {counts.dup > 0 && <span className="rounded-full bg-pastel-purple px-2.5 py-0.5 text-xs font-semibold text-pastel-purple-text">ซ้ำ {counts.dup}</span>}
            {counts.bad > 0 && <span className="rounded-full bg-error/10 px-2.5 py-0.5 text-xs font-semibold text-error">ใช้ไม่ได้ {counts.bad}</span>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {items.map((item) => (
              <PreviewCard key={item.key} item={item} onRemove={() => removeItem(item.key)} />
            ))}
          </div>

          <div className="sticky bottom-4 flex flex-wrap items-center gap-3 rounded-card border border-white/60 bg-white/85 p-4 shadow-card-hover backdrop-blur">
            <button
              type="button"
              onClick={() => save(true)}
              disabled={loading || counts.ready === 0}
              className="font-display rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-on-primary shadow-glow transition-transform hover:scale-[1.03] active:scale-95 disabled:opacity-50"
            >
              บันทึกเฉพาะที่ไม่ซ้ำ ({counts.ready})
            </button>
            <button
              type="button"
              onClick={() => save(false)}
              disabled={loading}
              className="rounded-full bg-pastel-yellow px-5 py-2.5 text-sm font-semibold text-pastel-yellow-text transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50"
            >
              บันทึกทั้งหมดเป็น Pending
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={loading}
              className="ml-auto rounded-full px-4 py-2.5 text-sm font-semibold text-label transition-colors hover:text-error"
            >
              ล้างทั้งหมด
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: summary ── */}
      {step === "done" && summary && (
        <section className="rounded-card border border-white/60 bg-white/85 p-6 shadow-card backdrop-blur">
          <h2 className="font-display text-lg font-bold text-text-strong">นำเข้าเสร็จแล้ว 🎉</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "ทั้งหมด", value: summary.total, cls: "bg-surface-container text-text-strong" },
              { label: "เพิ่มใหม่", value: summary.inserted, cls: "bg-pastel-mint text-pastel-mint-text" },
              { label: "ซ้ำ", value: summary.duplicate, cls: "bg-pastel-purple text-pastel-purple-text" },
              { label: "ผิดพลาด", value: summary.failed, cls: "bg-pastel-yellow text-pastel-yellow-text" },
            ].map((s) => (
              <div key={s.label} className={`rounded-control p-3 text-center ${s.cls}`}>
                <p className="font-display text-2xl font-extrabold">{s.value}</p>
                <p className="text-xs font-semibold">{s.label}</p>
              </div>
            ))}
          </div>

          {summary.errors.length > 0 && (
            <ul className="mt-4 max-h-40 space-y-1 overflow-y-auto rounded-control bg-surface-cream p-3 text-xs text-text">
              {summary.errors.map((e) => (
                <li key={e.row}>แถวที่ {e.row}: {e.message}</li>
              ))}
            </ul>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/admin/pending"
              className="font-display rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-on-primary shadow-glow transition-transform hover:scale-[1.03] active:scale-95"
            >
              ไปตรวจโพสต์ Pending →
            </Link>
            <button
              type="button"
              onClick={reset}
              className="rounded-full border border-outline/40 px-5 py-2.5 text-sm font-semibold text-text transition-colors hover:bg-surface-container-low"
            >
              เพิ่มลิงก์ต่อ
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function PreviewCard({ item, onRemove }: { item: Item; onRemove: () => void }) {
  const [imgFailed, setImgFailed] = useState(false);
  const row = item.row;
  const preview = row?.preview_image_url ?? null;
  const badge = !item.ok
    ? { text: "ใช้ไม่ได้", cls: "bg-error/10 text-error" }
    : item.dupInBatch
      ? { text: "ซ้ำในรายการนี้", cls: "bg-pastel-purple text-pastel-purple-text" }
      : item.existsInDb
        ? { text: "มีอยู่แล้วในระบบ", cls: "bg-pastel-purple text-pastel-purple-text" }
        : { text: "พร้อมบันทึก", cls: "bg-pastel-mint text-pastel-mint-text" };

  return (
    <article className="flex gap-3 overflow-hidden rounded-card border border-white/60 bg-white/85 p-3 shadow-card backdrop-blur">
      {/* Preview image */}
      <div className="h-28 w-24 shrink-0 overflow-hidden rounded-[1rem] bg-surface-container">
        {preview && !imgFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" onError={() => setImgFailed(true)} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-container to-pastel-purple">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8 text-primary/60" aria-hidden>
              <path d="M12 21s-6.7-4.35-9.3-8.1C.8 10.1 1.4 6.6 4.3 5.1c2.3-1.2 4.9-.4 6.4 1.4l1.3 1.6 1.3-1.6c1.5-1.8 4.1-2.6 6.4-1.4 2.9 1.5 3.5 5 1.6 7.8C18.7 16.65 12 21 12 21z" />
            </svg>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badge.cls}`}>{badge.text}</span>
          <button
            type="button"
            onClick={onRemove}
            className="shrink-0 text-label transition-colors hover:text-error"
            aria-label="ลบรายการนี้"
          >
            ✕
          </button>
        </div>

        {item.ok && row ? (
          <>
            <p className="mt-1.5 truncate text-sm font-semibold text-text-strong">
              {row.phone_brand ? `${row.phone_brand} ${row.phone_model ?? ""}` : row.username}
            </p>
            <p className="truncate text-xs text-label">
              {row.username} · {PLATFORM_LABELS[row.platform]}
              {row.tweet_id ? ` · ${row.tweet_id}` : ""}
            </p>
            {row.post_text ? (
              <p className="mt-1 line-clamp-2 text-xs text-text">{row.post_text}</p>
            ) : (
              <p className="mt-1 text-xs italic text-label">ดึงข้อความไม่ได้ — แก้ไขทีหลังที่ Pending ได้</p>
            )}
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {row.lens_status && row.lens_status !== "unknown" && (
                <span className="rounded-full bg-surface-container px-2 py-0.5 text-[10px] text-label">{LENS_LABELS_TH[row.lens_status]}</span>
              )}
              {row.video_quality && (
                <span className="rounded-full bg-surface-container px-2 py-0.5 text-[10px] text-label">{row.video_quality}</span>
              )}
              <span className="rounded-full bg-surface-container px-2 py-0.5 text-[10px] text-label">{SOURCE_LABELS_TH[row.review_source_type ?? "unknown"]}</span>
            </div>
            <a
              href={row.original_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 inline-block text-xs font-semibold text-primary underline-offset-2 hover:underline"
            >
              เปิดโพสต์ต้นฉบับ ↗
            </a>
          </>
        ) : (
          <p className="mt-2 break-all text-xs text-error">
            {item.error ?? "ใช้ไม่ได้"}: {item.input}
          </p>
        )}
      </div>
    </article>
  );
}
