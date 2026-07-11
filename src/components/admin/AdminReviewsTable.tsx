"use client";

import { useState, useMemo } from "react";
import {
  LENS_LABELS_TH,
  PLATFORM_LABELS,
  SOURCE_LABELS_TH,
  STATUS_LABELS_TH,
  type PostStatus,
  type ReviewWithMedia,
} from "@/types/review";
import { formatThaiDate } from "@/lib/utils/format";
import { updatePost, type PostPatch } from "@/lib/actions/reviews";

const STATUS_BADGE: Record<PostStatus, string> = {
  approved:  "bg-pastel-mint text-pastel-mint-text",
  pending:   "bg-pastel-yellow text-pastel-yellow-text",
  hidden:    "bg-surface-container text-label",
  duplicate: "bg-pastel-purple text-pastel-purple-text",
};

const ALL_STATUSES: PostStatus[] = ["approved", "pending", "hidden", "duplicate"];

/** Tiny toast for action feedback */
function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  function show(text: string) {
    setMsg(text);
    setTimeout(() => setMsg(null), 2500);
  }
  return { msg, show };
}

/** Inline edit modal */
function EditModal({
  review,
  onClose,
  onSave,
}: {
  review: ReviewWithMedia;
  onClose: () => void;
  onSave: (id: string, patch: Partial<ReviewWithMedia>) => void;
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
    review_source_type: review.review_source_type,
    summary_th:         review.summary_th ?? "",
    status:             review.status,
  });

  function field(key: keyof typeof form, label: string, type: "text" | "select" = "text", opts?: string[]) {
    return (
      <div key={key}>
        <label className="mb-1 block text-xs font-semibold text-label">{label}</label>
        {type === "select" ? (
          <select
            value={form[key]}
            onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
            className="w-full rounded-control border border-outline/40 bg-surface-cream px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          >
            {opts?.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <input
            value={form[key]}
            onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
            className="w-full rounded-control border border-outline/40 bg-surface-cream px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-card bg-white p-5 shadow-card-hover"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold text-text-strong">แก้ไขรีวิว #{review.id}</h2>
          <button onClick={onClose} className="text-label hover:text-text text-xl leading-none">×</button>
        </div>

        <p className="mb-4 text-xs text-label line-clamp-2">{review.post_text}</p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {field("phone_brand", "แบรนด์มือถือ")}
          {field("phone_model", "รุ่นมือถือ")}
          {field("phone_slug", "phone_slug")}
          {field("lens_status", "เลนส์", "select", Object.keys(LENS_LABELS_TH))}
          {field("suggested_model", "รุ่นที่ระบบสงสัย")}
          {field("model_hint", "model hint")}
          {field("model_match_status", "model match", "select", ["canonical", "suggested", "unknown"])}
          {field("place", "สถานที่")}
          {field("place_slug", "place_slug")}
          {field("video_quality", "คุณภาพวิดีโอ")}
          {field("year", "ปี")}
          {field("review_source_type", "ประเภทรีวิว", "select", ["customer", "shop", "unknown"])}
          {field("status", "Status", "select", ALL_STATUSES)}
        </div>

        <div className="mt-3">
          <label className="mb-1 block text-xs font-semibold text-label">แฮชแท็ก (คั่นด้วย , )</label>
          <input
            value={form.hashtags}
            onChange={(e) => setForm((f) => ({ ...f, hashtags: e.target.value }))}
            className="w-full rounded-control border border-outline/40 bg-surface-cream px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="mt-3">
          <label className="mb-1 block text-xs font-semibold text-label">สรุปภาษาไทย</label>
          <textarea
            value={form.summary_th}
            onChange={(e) => setForm((f) => ({ ...f, summary_th: e.target.value }))}
            rows={2}
            className="w-full rounded-control border border-outline/40 bg-surface-cream px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={() =>
              onSave(review.id, {
                ...form,
                year: form.year ? Number(form.year) : null,
                hashtags: form.hashtags.split(",").map((h) => h.trim()).filter(Boolean),
                lens_status: form.lens_status as ReviewWithMedia["lens_status"],
                review_source_type: form.review_source_type as ReviewWithMedia["review_source_type"],
                status: form.status as PostStatus,
              })
            }
            className="flex-1 rounded-full bg-primary py-2.5 text-sm font-semibold text-on-primary transition-transform hover:scale-[1.01] active:scale-95"
          >
            บันทึก
          </button>
          <button
            onClick={onClose}
            className="rounded-full border border-outline/40 px-4 py-2.5 text-sm font-semibold text-text transition-colors hover:bg-surface-container-low"
          >
            ยกเลิก
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminReviewsTable({ initialReviews }: { initialReviews: ReviewWithMedia[] }) {
  const [reviews, setReviews] = useState(initialReviews);
  const [search, setSearch]   = useState("");
  const [statusFilter, setStatusFilter] = useState<PostStatus | "all">("all");
  const [editing, setEditing] = useState<ReviewWithMedia | null>(null);
  const { msg, show } = useToast();

  const filtered = useMemo(() => {
    let r = reviews;
    if (statusFilter !== "all") r = r.filter((x) => x.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(
        (x) =>
          x.display_name.toLowerCase().includes(q) ||
          x.username.toLowerCase().includes(q) ||
          (x.phone_model ?? "").toLowerCase().includes(q) ||
          (x.place ?? "").toLowerCase().includes(q) ||
          x.post_text.toLowerCase().includes(q)
      );
    }
    return r;
  }, [reviews, search, statusFilter]);

  async function handleSave(id: string, patch: Partial<ReviewWithMedia>) {
    const result = await updatePost(id, patch as PostPatch);
    if (!result.ok) {
      show(`บันทึกไม่สำเร็จ: ${result.error}`);
      return;
    }
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setEditing(null);
    show("บันทึกแล้ว");
  }

  async function handleStatusChange(id: string, status: PostStatus) {
    const result = await updatePost(id, { status });
    if (!result.ok) {
      show(`เปลี่ยน status ไม่สำเร็จ: ${result.error}`);
      return;
    }
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    show(`เปลี่ยน status เป็น "${STATUS_LABELS_TH[status]}" แล้ว`);
  }

  return (
    <>
      {/* Toast */}
      {msg && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-text-strong px-5 py-2.5 text-sm font-semibold text-white shadow-card-hover">
          {msg}
        </div>
      )}

      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <svg
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-label"
          >
            <circle cx={11} cy={11} r={7} />
            <path strokeLinecap="round" d="m20 20-3.5-3.5" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อ, รุ่น, สถานที่..."
            className="w-full rounded-full bg-surface-cream py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as PostStatus | "all")}
          className="rounded-control border border-outline/40 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="all">ทุก Status ({reviews.length})</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS_TH[s]} ({reviews.filter((r) => r.status === s).length})
            </option>
          ))}
        </select>
      </div>

      <p className="mb-3 text-sm text-label">แสดง {filtered.length} จาก {reviews.length} รายการ</p>

      {/* Table */}
      <div className="overflow-x-auto rounded-card border border-outline/20 bg-white shadow-card">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-outline/15 bg-surface-container-low text-xs font-semibold text-label">
              <th className="px-4 py-3 text-left">รีวิว</th>
              <th className="px-4 py-3 text-left">รุ่น / แบรนด์</th>
              <th className="px-4 py-3 text-left">Platform</th>
              <th className="px-4 py-3 text-left">สถานที่</th>
              <th className="px-4 py-3 text-left">วันที่</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-label">ไม่พบรีวิวที่ตรงกับเงื่อนไข</td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-outline/10 hover:bg-surface-container-low/50">
                <td className="px-4 py-3 max-w-[200px]">
                  <p className="font-semibold text-text-strong truncate">{r.display_name}</p>
                  <p className="text-xs text-label truncate">{r.username}</p>
                  <p className="mt-0.5 text-xs text-text line-clamp-2">{r.summary_th || r.post_text}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-text-strong">{r.phone_brand}</p>
                  <p className="text-xs text-label">{r.phone_model}</p>
                  {r.model_hint && <p className="text-xs text-label">Hint: {r.model_hint}</p>}
                  {r.suggested_model && <p className="text-xs text-pastel-yellow-text">สงสัย: {r.suggested_model}</p>}
                  <p className="text-xs text-label">{LENS_LABELS_TH[r.lens_status]}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-surface-container px-2.5 py-0.5 text-xs font-semibold">
                    {PLATFORM_LABELS[r.platform]}
                  </span>
                  <p className="mt-1 text-xs text-label">{SOURCE_LABELS_TH[r.review_source_type]}</p>
                </td>
                <td className="px-4 py-3 text-xs text-text">{r.place ?? "—"}</td>
                <td className="px-4 py-3 text-xs text-label whitespace-nowrap">{formatThaiDate(r.posted_at)}</td>
                <td className="px-4 py-3">
                  <select
                    value={r.status}
                    onChange={(e) => handleStatusChange(r.id, e.target.value as PostStatus)}
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold border-0 outline-none cursor-pointer ${STATUS_BADGE[r.status]}`}
                  >
                    {ALL_STATUSES.map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS_TH[s]}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <a
                      href={r.original_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-label underline-offset-2 hover:text-primary hover:underline"
                    >
                      ต้นฉบับ
                    </a>
                    <button
                      onClick={() => setEditing(r)}
                      className="rounded-full bg-primary-container px-3 py-1.5 text-xs font-semibold text-on-primary-container transition-colors hover:bg-primary hover:text-on-primary"
                    >
                      แก้ไข
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditModal review={editing} onClose={() => setEditing(null)} onSave={handleSave} />
      )}
    </>
  );
}
