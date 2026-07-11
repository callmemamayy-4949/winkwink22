"use client";

import { useState } from "react";
import { PLATFORM_LABELS, LENS_LABELS_TH, SOURCE_LABELS_TH, type ReviewWithMedia } from "@/types/review";
import { formatThaiDate } from "@/lib/utils/format";
import { updatePost, type PostPatch } from "@/lib/actions/reviews";

type Action = "approved" | "hidden" | "duplicate";

const ACTION_STYLES: Record<Action, string> = {
  approved:  "bg-pastel-mint text-pastel-mint-text border-pastel-mint hover:bg-pastel-mint/70",
  hidden:    "bg-surface-container text-label border-surface-container hover:bg-surface-container-high",
  duplicate: "bg-pastel-purple text-pastel-purple-text border-pastel-purple hover:bg-pastel-purple/70",
};

const ACTION_LABELS: Record<Action, string> = {
  approved:  "✅ Approve",
  hidden:    "🙈 ซ่อน",
  duplicate: "📋 Duplicate",
};

function PendingCard({
  review,
  onAction,
  busy,
}: {
  review: ReviewWithMedia;
  onAction: (id: string, action: Action, patch: PostPatch) => void;
  busy: boolean;
}) {
  const [form, setForm] = useState({
    phone_brand:        review.phone_brand ?? "",
    phone_model:        review.phone_model ?? "",
    phone_slug:         review.phone_slug ?? "",
    lens_status:        review.lens_status,
    suggested_model:    review.suggested_model ?? "",
    model_hint:         review.model_hint ?? "",
    model_match_status: review.model_match_status ?? "unknown",
    place:              review.place ?? "",
    place_slug:         review.place_slug ?? "",
    video_quality:      review.video_quality ?? "",
    year:               review.year?.toString() ?? "",
    hashtags:           review.hashtags.join(", "),
    platform:           review.platform,
    review_source_type: review.review_source_type,
    summary_th:         review.summary_th ?? "",
  });

  const cover = review.media[0];

  return (
    <div className="overflow-hidden rounded-card bg-white shadow-card">
      {/* Media + header */}
      <div className="flex gap-0">
        {cover && (
          <div className="h-28 w-28 shrink-0 bg-surface-container">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cover.thumbnail_url ?? cover.media_url}
              alt=""
              className="h-full w-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          </div>
        )}
        <div className="min-w-0 flex-1 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-bold text-text-strong">{review.display_name}</p>
              <p className="text-xs text-label">{review.username} · {formatThaiDate(review.posted_at)}</p>
            </div>
            <span className="shrink-0 rounded-full bg-surface-container px-2.5 py-0.5 text-xs font-semibold">
              {PLATFORM_LABELS[review.platform]}
            </span>
          </div>
          <p className="mt-2 text-sm text-text line-clamp-2">{review.post_text}</p>
          {review.model_hint && (
            <p className="mt-1 rounded-control bg-pastel-yellow/60 px-2 py-1 text-xs font-medium text-pastel-yellow-text">
              Hint: {review.model_hint}
            </p>
          )}
          <a
            href={review.original_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-xs font-semibold text-primary underline-offset-2 hover:underline"
          >
            ดูโพสต์ต้นฉบับ ↗
          </a>
        </div>
      </div>

      {/* Edit fields */}
      <div className="border-t border-outline/10 p-4">
        <p className="mb-3 text-xs font-semibold text-label">แก้ไขข้อมูล</p>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {(
            [
              ["phone_brand",        "แบรนด์"],
              ["phone_model",        "รุ่นมือถือ"],
              ["phone_slug",         "phone_slug"],
              ["model_hint",         "model hint"],
              ["suggested_model",    "รุ่นที่ระบบสงสัย"],
              ["model_match_status", "model match"],
              ["place",              "สถานที่"],
              ["place_slug",         "place_slug"],
              ["video_quality",      "คุณภาพวิดีโอ"],
              ["year",               "ปี"],
              ["hashtags",           "แฮชแท็ก (คั่ง ,)"],
              ["summary_th",         "สรุปภาษาไทย"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className={key === "summary_th" || key === "hashtags" ? "col-span-2 sm:col-span-3" : ""}>
              <label className="mb-0.5 block text-[10px] font-semibold text-label">{label}</label>
              <input
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                className="w-full rounded-control border border-outline/30 bg-surface-cream px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          ))}

          <div>
            <label className="mb-0.5 block text-[10px] font-semibold text-label">เลนส์</label>
            <select
              value={form.lens_status}
              onChange={(e) => setForm((f) => ({ ...f, lens_status: e.target.value as typeof form.lens_status }))}
              className="w-full rounded-control border border-outline/30 bg-surface-cream px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/30"
            >
              {Object.entries(LENS_LABELS_TH).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>

          <div>
            <label className="mb-0.5 block text-[10px] font-semibold text-label">Platform</label>
            <select
              value={form.platform}
              onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value as typeof form.platform }))}
              className="w-full rounded-control border border-outline/30 bg-surface-cream px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/30"
            >
              {Object.entries(PLATFORM_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>

          <div>
            <label className="mb-0.5 block text-[10px] font-semibold text-label">ประเภทรีวิว</label>
            <select
              value={form.review_source_type}
              onChange={(e) => setForm((f) => ({ ...f, review_source_type: e.target.value as typeof form.review_source_type }))}
              className="w-full rounded-control border border-outline/30 bg-surface-cream px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/30"
            >
              {Object.entries(SOURCE_LABELS_TH).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-4 flex flex-wrap gap-2">
          {(["approved", "hidden", "duplicate"] as const).map((action) => (
            <button
              key={action}
              disabled={busy}
              onClick={() =>
                onAction(review.id, action, {
                  ...form,
                  year: form.year ? Number(form.year) : null,
                  hashtags: form.hashtags.split(",").map((h) => h.trim()).filter(Boolean),
                })
              }
              className={`flex-1 rounded-full border px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40 ${ACTION_STYLES[action]}`}
            >
              {ACTION_LABELS[action]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PendingList({ initialReviews }: { initialReviews: ReviewWithMedia[] }) {
  const [reviews, setReviews] = useState(initialReviews);
  const [toast, setToast]     = useState<string | null>(null);
  const [busyId, setBusyId]   = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  async function handleAction(id: string, action: Action, patch: PostPatch) {
    setBusyId(id);
    const labels: Record<Action, string> = {
      approved:  "อนุมัติแล้ว ✅",
      hidden:    "ซ่อนแล้ว 🙈",
      duplicate: "มาร์คซ้ำแล้ว 📋",
    };

    const result = await updatePost(id, { ...patch, status: action });
    setBusyId(null);

    if (!result.ok) {
      showToast(`บันทึกไม่สำเร็จ: ${result.error}`);
      return;
    }

    setReviews((prev) => prev.filter((r) => r.id !== id));
    showToast(labels[action]);
  }

  return (
    <>
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-text-strong px-5 py-2.5 text-sm font-semibold text-white shadow-card-hover">
          {toast}
        </div>
      )}

      {reviews.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-outline/40 bg-white/60 py-20 text-center">
          <span className="text-4xl">🎉</span>
          <p className="font-semibold text-text-strong">ไม่มีรีวิวรอตรวจสอบ</p>
          <p className="text-sm text-label">ทุกรายการได้รับการดำเนินการแล้ว</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {reviews.map((r) => (
            <PendingCard key={r.id} review={r} onAction={handleAction} busy={busyId === r.id} />
          ))}
        </div>
      )}
    </>
  );
}
