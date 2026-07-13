"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MultiSelectDropdown } from "@/components/reviews/MultiSelectDropdown";
import type { FilterFacets } from "@/lib/data/reviews";
import { filtersToSearchString } from "@/lib/utils/query";
import {
  LENS_LABELS_TH,
  SORT_LABELS_TH,
  SOURCE_LABELS_TH,
  type ReviewFilters,
  type SortOption,
} from "@/types/review";

const SORT_OPTIONS: SortOption[] = [
  "likes",
  "newest",
  "oldest",
];

const FILTER_KEYS = ["brand", "model", "lens", "place", "quality", "hashtag", "year", "source"] as const;

export function ReviewsControls({
  facets,
  filters,
  lockModel = false,
}: {
  facets: FilterFacets;
  filters: ReviewFilters;
  lockModel?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [filtersOpen, setFiltersOpen] = useState(false);

  function navigate(next: ReviewFilters) {
    const qs = filtersToSearchString({ ...next, sort: next.sort ?? "likes" });
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function updateFilter<K extends keyof ReviewFilters>(key: K, value: ReviewFilters[K]) {
    navigate({ ...filters, [key]: value });
  }

  const activeChips: { key: keyof ReviewFilters; value: string; label: string }[] = [];
  FILTER_KEYS.forEach(
    (key) => {
      const values = filters[key] as string[] | undefined;
      values?.forEach((v) => {
        const labelMap: Record<string, string> = {
          model: facets.models.find((m) => m.slug === v)?.label ?? v,
          place: facets.places.find((p) => p.slug === v)?.label ?? v,
          lens: LENS_LABELS_TH[v as keyof typeof LENS_LABELS_TH] ?? v,
          source: SOURCE_LABELS_TH[v as keyof typeof SOURCE_LABELS_TH] ?? v,
          hashtag: `#${v}`,
        };
        activeChips.push({ key, value: v, label: labelMap[key] ?? v });
      });
    }
  );

  function removeChip(key: keyof ReviewFilters, value: string) {
    const values = (filters[key] as string[] | undefined) ?? [];
    updateFilter(key, values.filter((v) => v !== value) as ReviewFilters[typeof key]);
  }

  const hasAnyFilter = activeChips.length > 0 || !!filters.q;
  const activeSort = filters.sort ?? "likes";
  const filterControls = (
    <>
      {!lockModel && (
        <MultiSelectDropdown
          label="รุ่นมือถือ"
          options={facets.models.map((m) => ({ value: m.slug, label: m.label }))}
          selected={filters.model ?? []}
          onChange={(v) => updateFilter("model", v)}
        />
      )}
      <MultiSelectDropdown
        label="แบรนด์"
        options={facets.brands.map((b) => ({ value: b, label: b }))}
        selected={filters.brand ?? []}
        onChange={(v) => updateFilter("brand", v)}
      />
      <MultiSelectDropdown
        label="เลนส์"
        options={Object.entries(LENS_LABELS_TH).map(([value, label]) => ({ value, label }))}
        selected={filters.lens ?? []}
        onChange={(v) => updateFilter("lens", v as ReviewFilters["lens"])}
        searchable={false}
      />
      <MultiSelectDropdown
        label="สถานที่"
        options={facets.places.map((p) => ({ value: p.slug, label: p.label }))}
        selected={filters.place ?? []}
        onChange={(v) => updateFilter("place", v)}
      />
      <MultiSelectDropdown
        label="คุณภาพวิดีโอ"
        options={facets.qualities.map((q) => ({ value: q, label: q }))}
        selected={filters.quality ?? []}
        onChange={(v) => updateFilter("quality", v)}
        searchable={false}
      />
      <MultiSelectDropdown
        label="แฮชแท็ก"
        options={facets.hashtags.map((h) => ({ value: h, label: `#${h}` }))}
        selected={filters.hashtag ?? []}
        onChange={(v) => updateFilter("hashtag", v)}
      />
      <MultiSelectDropdown
        label="ปี"
        options={facets.years.map((y) => ({ value: String(y), label: String(y) }))}
        selected={filters.year ?? []}
        onChange={(v) => updateFilter("year", v)}
        searchable={false}
      />
      <MultiSelectDropdown
        label="ประเภทรีวิว"
        options={Object.entries(SOURCE_LABELS_TH)
          .filter(([value]) => value !== "unknown")
          .map(([value, label]) => ({ value, label }))}
        selected={filters.source ?? []}
        onChange={(v) => updateFilter("source", v as ReviewFilters["source"])}
        searchable={false}
      />
    </>
  );

  return (
    <>
      <div className="flex items-center justify-between gap-3 sm:hidden">
        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          className="inline-flex min-h-12 touch-manipulation items-center gap-2 rounded-2xl border border-primary/20 bg-white px-4 py-2 text-sm font-bold text-text-strong shadow-card active:scale-95"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-primary" aria-hidden>
            <path d="M3 5.5A1.5 1.5 0 0 1 4.5 4h15a1.5 1.5 0 0 1 1.2 2.4L15 14v4.3a1 1 0 0 1-.55.9l-4 2A1 1 0 0 1 9 20.3V14L3.3 6.4A1.5 1.5 0 0 1 3 5.5Z" />
          </svg>
          ตัวกรอง
          {activeChips.length > 0 && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-on-primary">{activeChips.length}</span>
          )}
        </button>
        <label className="relative block min-w-36">
          <span className="sr-only">จัดเรียงตาม</span>
          <select
            value={activeSort}
            onChange={(e) => updateFilter("sort", e.target.value as SortOption)}
            className="min-h-12 w-full appearance-none rounded-2xl border border-outline/20 bg-white py-2 pl-4 pr-10 text-sm font-bold text-text-strong shadow-card outline-none focus:ring-2 focus:ring-primary/25"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option} value={option}>{SORT_LABELS_TH[option]}</option>
            ))}
          </select>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-label" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
          </svg>
        </label>
      </div>

      {filtersOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/35 sm:hidden" onClick={() => setFiltersOpen(false)}>
          <div
            className="max-h-[82vh] w-full overflow-y-auto rounded-t-[1.5rem] bg-white p-4 shadow-card-hover"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="font-display text-lg font-bold text-text-strong">ตัวกรอง</p>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="min-h-11 rounded-full px-4 text-sm font-semibold text-primary hover:bg-primary-container/60"
              >
                ปิด
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">{filterControls}</div>
            {hasAnyFilter && (
              <button
                type="button"
                onClick={() => navigate({ sort: filters.sort })}
                className="mt-4 min-h-11 w-full rounded-full bg-primary-container px-4 py-2 text-sm font-bold text-primary"
              >
                ล้างตัวกรองทั้งหมด
              </button>
            )}
          </div>
        </div>
      )}

      <div className="relative z-40 hidden overflow-visible rounded-card border border-white/60 bg-white/70 p-4 shadow-card backdrop-blur-xl sm:block sm:p-6">
        <div className="flex flex-wrap items-center gap-2">{filterControls}</div>

        {hasAnyFilter && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-outline/15 pt-3">
          {filters.q && (
            <button
              type="button"
              onClick={() => updateFilter("q", undefined)}
              className="flex min-h-11 touch-manipulation items-center gap-1 rounded-full bg-primary-container/70 px-3.5 py-2 text-xs font-medium text-on-primary-container transition-transform hover:scale-[1.03] active:scale-95"
            >
              &ldquo;{filters.q}&rdquo;
              <span className="text-primary">×</span>
            </button>
          )}
          {activeChips.map((chip) => (
            <button
              key={`${chip.key}-${chip.value}`}
              type="button"
              onClick={() => removeChip(chip.key, chip.value)}
              className="flex min-h-11 touch-manipulation items-center gap-1 rounded-full bg-primary-container/70 px-3.5 py-2 text-xs font-medium text-on-primary-container transition-transform hover:scale-[1.03] active:scale-95"
            >
              {chip.label}
              <span className="text-primary">×</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => navigate({ sort: filters.sort })}
            className="ml-1 min-h-11 touch-manipulation rounded-full px-3 py-2 text-xs font-semibold text-primary underline-offset-2 hover:bg-surface-container-low hover:underline active:bg-primary-container/70"
          >
            ล้างตัวกรองทั้งหมด
          </button>
        </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/50 pt-4">
        <span className="mr-1 text-sm text-label">จัดเรียงตาม</span>
        {SORT_OPTIONS.map((option) => {
          const active = activeSort === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => updateFilter("sort", option)}
              className={`min-h-11 touch-manipulation rounded-full px-4 py-2 text-sm font-medium transition-all hover:scale-[1.03] active:scale-95 ${
                active
                  ? "bg-gradient-primary text-on-primary shadow-sm"
                  : "bg-white/70 text-label hover:text-text"
              }`}
            >
              {SORT_LABELS_TH[option]}
            </button>
          );
        })}
        </div>
      </div>
    </>
  );
}
