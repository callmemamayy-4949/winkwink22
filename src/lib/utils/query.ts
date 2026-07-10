import type { ReviewFilters, SortOption } from "@/types/review";

const ARRAY_KEYS = [
  "brand",
  "model",
  "lens",
  "place",
  "quality",
  "hashtag",
  "year",
  "source",
  "platform",
] as const;

type SearchParamsInput = Record<string, string | string[] | undefined>;

function splitParam(value: string | string[] | undefined): string[] | undefined {
  if (!value) return undefined;
  const raw = Array.isArray(value) ? value.join(",") : value;
  const parts = raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  return parts.length ? parts : undefined;
}

/** Parses a Next.js `searchParams` object into typed, structured filters. */
export function parseReviewFilters(params: SearchParamsInput): ReviewFilters {
  const filters: ReviewFilters = {};

  const q = params.q;
  if (typeof q === "string" && q.trim()) filters.q = q.trim();

  for (const key of ARRAY_KEYS) {
    const values = splitParam(params[key]);
    if (values) (filters as Record<string, string[]>)[key] = values;
  }

  const sort = params.sort;
  if (typeof sort === "string") filters.sort = sort as SortOption;

  return filters;
}

/** Serializes filters back into a query string (no leading `?`). */
export function filtersToSearchString(filters: ReviewFilters): string {
  const search = new URLSearchParams();

  if (filters.q) search.set("q", filters.q);
  for (const key of ARRAY_KEYS) {
    const values = filters[key];
    if (values?.length) search.set(key, values.join(","));
  }
  if (filters.sort && filters.sort !== "newest") search.set("sort", filters.sort);

  return search.toString();
}
