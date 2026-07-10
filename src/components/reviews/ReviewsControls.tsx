"use client";

import { usePathname, useRouter } from "next/navigation";
import { MultiSelectDropdown } from "@/components/reviews/MultiSelectDropdown";
import type { FilterFacets } from "@/lib/data/reviews";
import { filtersToSearchString } from "@/lib/utils/query";
import {
  LENS_LABELS_TH,
  PLATFORM_LABELS,
  SORT_LABELS_TH,
  SOURCE_LABELS_TH,
  type ReviewFilters,
  type SortOption,
} from "@/types/review";

const SORT_OPTIONS: SortOption[] = [
  "newest",
  "oldest",
  "most_retweets",
  "most_likes",
  "most_views",
];

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

  function navigate(next: ReviewFilters) {
    const qs = filtersToSearchString(next);
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function updateFilter<K extends keyof ReviewFilters>(key: K, value: ReviewFilters[K]) {
    navigate({ ...filters, [key]: value });
  }

  const activeChips: { key: keyof ReviewFilters; value: string; label: string }[] = [];
  (["brand", "model", "lens", "place", "quality", "hashtag", "year", "source", "platform"] as const).forEach(
    (key) => {
      const values = filters[key] as string[] | undefined;
      values?.forEach((v) => {
        const labelMap: Record<string, string> = {
          model: facets.models.find((m) => m.slug === v)?.label ?? v,
          place: facets.places.find((p) => p.slug === v)?.label ?? v,
          lens: LENS_LABELS_TH[v as keyof typeof LENS_LABELS_TH] ?? v,
          source: SOURCE_LABELS_TH[v as keyof typeof SOURCE_LABELS_TH] ?? v,
          platform: PLATFORM_LABELS[v as keyof typeof PLATFORM_LABELS] ?? v,
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

  return (
    <div className="rounded-card border border-white/60 bg-white/70 p-4 shadow-card backdrop-blur-xl sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
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
        <MultiSelectDropdown
          label="Platform"
          options={Object.entries(PLATFORM_LABELS).map(([value, label]) => ({ value, label }))}
          selected={filters.platform ?? []}
          onChange={(v) => updateFilter("platform", v as ReviewFilters["platform"])}
          searchable={false}
        />
      </div>

      {hasAnyFilter && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-outline/15 pt-3">
          {filters.q && (
            <button
              type="button"
              onClick={() => updateFilter("q", undefined)}
              className="flex items-center gap-1 rounded-full bg-primary-container/70 px-3 py-1.5 text-xs font-medium text-on-primary-container transition-transform hover:scale-[1.03] active:scale-95"
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
              className="flex items-center gap-1 rounded-full bg-primary-container/70 px-3 py-1.5 text-xs font-medium text-on-primary-container transition-transform hover:scale-[1.03] active:scale-95"
            >
              {chip.label}
              <span className="text-primary">×</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => navigate({ sort: filters.sort })}
            className="ml-1 text-xs font-semibold text-primary underline-offset-2 hover:underline"
          >
            ล้างตัวกรองทั้งหมด
          </button>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/50 pt-4">
        <span className="mr-1 text-sm text-label">จัดเรียงตาม</span>
        {SORT_OPTIONS.map((option) => {
          const active = (filters.sort ?? "newest") === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => updateFilter("sort", option)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-all hover:scale-[1.03] active:scale-95 ${
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
  );
}
