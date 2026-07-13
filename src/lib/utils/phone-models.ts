import type { ImportRow, LensStatus, ModelMatchStatus } from "@/types/review";
import { slugify } from "@/lib/utils/slugify";
import { buildReviewSummary } from "@/lib/utils/review-summary";

type PhoneBrand = "Samsung" | "Vivo" | "Oppo";
type SourceField = "post_text" | "caption" | "hashtags" | "title" | "imported_hint" | "summary_th" | "phone_model" | "phone_slug" | "unknown";

export interface PhoneModelMaster {
  brand: PhoneBrand;
  model: string;
  slug: string;
  hasLens: boolean;
  aliases?: string[];
}

export interface PhoneModelEvidence {
  text: string;
  sourceField: SourceField;
  matchType: string;
}

export interface PhoneModelRejectedCandidate {
  value: string;
  reason: string;
}

export interface PhoneModelNormalization {
  phone_brand: string | null;
  phone_model: string | null;
  phone_slug: string | null;
  lens_status: LensStatus;
  suggested_model: string | null;
  model_match_status: ModelMatchStatus;
  confidence?: number;
  needs_review?: boolean;
  lens_size?: string | null;
  evidence?: PhoneModelEvidence[];
  rejected_candidates?: PhoneModelRejectedCandidate[];
}

export const PHONE_MODEL_MASTER_LIST: PhoneModelMaster[] = [
  { brand: "Samsung", model: "Samsung S22 Ultra", slug: "samsung-s22-ultra", hasLens: false, aliases: ["s22 ultra", "s22u", "s22", "samsung s22", "galaxy s22 ultra"] },
  { brand: "Samsung", model: "Samsung S23 Ultra", slug: "samsung-s23-ultra", hasLens: false, aliases: ["s23 ultra", "s23u", "s23", "samsung s23", "galaxy s23 ultra"] },
  { brand: "Samsung", model: "Samsung S24 Ultra", slug: "samsung-s24-ultra", hasLens: false, aliases: ["s24 ultra", "s24u", "s24", "samsung s24", "galaxy s24 ultra"] },
  { brand: "Samsung", model: "Samsung S25 Ultra", slug: "samsung-s25-ultra", hasLens: false, aliases: ["s25 ultra", "s25u", "s25", "samsung s25", "galaxy s25 ultra"] },
  { brand: "Samsung", model: "Samsung S26 Ultra", slug: "samsung-s26-ultra", hasLens: false, aliases: ["s26 ultra", "s26u", "s26", "samsung s26", "galaxy s26 ultra", "ซัมซุง 26 อัลตร้า"] },
  { brand: "Vivo", model: "Vivo X200 Pro", slug: "vivo-x200-pro", hasLens: false, aliases: ["vivo x200 pro", "vivox200pro", "vivo200pro", "x200 pro", "x200pro"] },
  { brand: "Vivo", model: "Vivo X200 Ultra", slug: "vivo-x200-ultra", hasLens: false, aliases: ["vivo x200 ultra", "vivox200ultra", "vivo200ultra", "x200 ultra", "x200ultra"] },
  { brand: "Vivo", model: "Vivo X200 Ultra + Lens 200mm", slug: "vivo-x200-ultra-lens-200mm", hasLens: true, aliases: ["vivo x200 ultra lens", "vivox200ultralens", "vivo200ultralens", "x200 ultra lens", "x200ultra 200mm"] },
  { brand: "Vivo", model: "Vivo X300 Pro", slug: "vivo-x300-pro", hasLens: false, aliases: ["vivo x300 pro", "vivox300pro", "vivo300pro", "x300 pro", "x300pro"] },
  { brand: "Vivo", model: "Vivo X300 Pro + Lens 200mm", slug: "vivo-x300-pro-lens-200mm", hasLens: true, aliases: ["vivo x300 pro lens", "vivox300prolens", "vivo300prolens", "vivo300pro lens", "vivo300pro เลนส์", "x300 pro lens", "x300pro 200mm"] },
  { brand: "Vivo", model: "Vivo X300 Ultra", slug: "vivo-x300-ultra", hasLens: false, aliases: ["vivo x300 ultra", "vivox300ultra", "vivo300ultra", "x300 ultra", "x300ultra"] },
  { brand: "Vivo", model: "Vivo X300 Ultra + Lens 400mm", slug: "vivo-x300-ultra-lens-400mm", hasLens: true, aliases: ["vivo x300 ultra lens", "vivox300ultralens", "vivo300ultralens", "x300 ultra lens", "x300ultra 400mm"] },
  { brand: "Oppo", model: "Oppo Find X9 Pro + Lens 200mm", slug: "oppo-find-x9-pro-lens-200mm", hasLens: true, aliases: ["oppo find x9 pro lens", "oppofindx9prolens", "findx9pro lens", "oppo x9pro lens", "x9pro 200mm"] },
  { brand: "Oppo", model: "Oppo Find X9 Ultra", slug: "oppo-find-x9-ultra", hasLens: false, aliases: ["oppo find x9 ultra", "oppofindx9ultra", "find x9 ultra", "findx9ultra", "oppo x9ultra", "x9 ultra", "x9ultra"] },
  { brand: "Oppo", model: "Oppo Find X9 Ultra + Lens 300mm", slug: "oppo-find-x9-ultra-lens-300mm", hasLens: true, aliases: ["oppo find x9 ultra lens", "oppofindx9ultralens", "findx9ultra lens", "oppo x9ultra lens", "x9ultra 300mm"] },
];

const MASTER_BY_KEY = new Map(PHONE_MODEL_MASTER_LIST.map((m) => [modelKey(m.model), m]));
const MASTER_BY_SLUG = new Map(PHONE_MODEL_MASTER_LIST.map((m) => [m.slug, m]));

const SOURCE_WEIGHT: Record<SourceField, number> = {
  post_text: 10,
  caption: 10,
  hashtags: 8,
  title: 6,
  imported_hint: 4,
  summary_th: 3,
  phone_model: 12,
  phone_slug: 12,
  unknown: 4,
};

interface TextSource {
  field: SourceField;
  value: string;
  normalized: string;
  compact: string;
}

interface ModelCandidate {
  master: PhoneModelMaster | null;
  value: string;
  brand: string | null;
  score: number;
  evidence: PhoneModelEvidence[];
  rejectedReason?: string;
}

interface LensDetection {
  status: LensStatus;
  size: string | null;
  conflict: boolean;
  evidence: PhoneModelEvidence[];
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/ออปโป้่|ออปโป้|ออปโป/g, "oppo")
    .replace(/ซัมซุง/g, "samsung")
    .replace(/วีโว่|วีโว/g, "vivo")
    .replace(/อัลตร้า|อัลตรา/g, "ultra")
    .replace(/[#+\-_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactText(value: string | null | undefined): string {
  return normalizeText(value)
    .replace(/เลนส์/g, "lens")
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, "");
}

function modelKey(text: string): string {
  return compactText(text).replace(/เลนส์/g, "lens");
}

function masterAliases(master: PhoneModelMaster): string[] {
  const base = [master.model, master.slug.replace(/-/g, " "), ...(master.aliases ?? [])];
  return [...new Set(base.flatMap((alias) => [normalizeText(alias), compactText(alias)]).filter(Boolean))];
}

function findExactMaster(value: string | null | undefined): PhoneModelMaster | null {
  const text = value?.trim();
  if (!text) return null;
  return MASTER_BY_KEY.get(modelKey(text)) ?? MASTER_BY_SLUG.get(slugify(text)) ?? null;
}

function addCandidate(candidates: ModelCandidate[], candidate: ModelCandidate) {
  const key = `${candidate.master?.slug ?? candidate.value}:${candidate.evidence.map((e) => e.text).join("|")}`;
  const existing = candidates.find((c) => `${c.master?.slug ?? c.value}:${c.evidence.map((e) => e.text).join("|")}` === key);
  if (!existing) candidates.push(candidate);
}

function collectBrandOnlyCandidate(sources: TextSource[]): ModelCandidate | null {
  const text = sources.map((s) => s.normalized).join(" ");
  const brand = /\boppo\b/.test(text)
    ? "Oppo"
    : /\bvivo\b/.test(text)
      ? "Vivo"
      : /\bsamsung\b|\bgalaxy\b/.test(text)
        ? "Samsung"
        : null;
  if (!brand) return null;
  return {
    master: null,
    value: brand,
    brand,
    score: 25,
    evidence: [{ text: brand, sourceField: "unknown", matchType: "brand_only" }],
    rejectedReason: "brand only, model not present",
  };
}

function collectMasterAliasCandidates(sources: TextSource[]): ModelCandidate[] {
  const candidates: ModelCandidate[] = [];
  for (const source of sources) {
    for (const master of PHONE_MODEL_MASTER_LIST) {
      for (const alias of masterAliases(master)) {
        if (!alias || alias.length < 3) continue;
        const compactAlias = compactText(alias);
        const normalizedHit = alias.includes(" ") && source.normalized.includes(alias);
        const compactHit = compactAlias.length >= 4 && source.compact.includes(compactAlias);
        if (!normalizedHit && !compactHit) continue;
        addCandidate(candidates, {
          master,
          value: master.model,
          brand: master.brand,
          score: (normalizedHit ? 90 : 85) + SOURCE_WEIGHT[source.field],
          evidence: [{
            text: alias,
            sourceField: source.field,
            matchType: normalizedHit ? "exact_alias" : "compact_exact",
          }],
        });
      }
    }
  }
  return candidates;
}

function masterForParts(brand: PhoneBrand, family: string, variant: string, wantsLens: boolean, noLens: boolean): PhoneModelMaster | null {
  const familyKey = modelKey(family);
  const variantKey = modelKey(variant);
  const matches = PHONE_MODEL_MASTER_LIST.filter((m) => {
    if (m.brand !== brand) return false;
    const key = modelKey(m.model);
    return key.includes(familyKey) && key.includes(variantKey);
  });
  if (matches.length === 0) return null;
  if (noLens) return matches.find((m) => !m.hasLens) ?? null;
  if (wantsLens) return matches.find((m) => m.hasLens) ?? matches.find((m) => !m.hasLens) ?? null;
  return matches.find((m) => !m.hasLens) ?? (matches.length === 1 ? matches[0] : null);
}

function collectPatternCandidates(sources: TextSource[], lens: LensDetection): ModelCandidate[] {
  const candidates: ModelCandidate[] = [];
  for (const source of sources) {
    const compact = source.compact;
    const add = (brand: PhoneBrand, family: string, variant: string, evidenceText: string, baseScore: number) => {
      const master = masterForParts(brand, family, variant, lens.status === "with_lens", lens.status === "without_lens");
      addCandidate(candidates, {
        master,
        value: `${brand} ${family} ${variant}`.replace(/\s+/g, " "),
        brand,
        score: baseScore + SOURCE_WEIGHT[source.field] + (master ? 0 : -30),
        evidence: [{ text: evidenceText, sourceField: source.field, matchType: "pattern" }],
        rejectedReason: master ? undefined : "candidate did not match an available master configuration",
      });
    };

    for (const match of compact.matchAll(/(?:oppo)?(?:find)?x9(pro|ultra)/g)) {
      add("Oppo", "Find X9", match[1] === "pro" ? "Pro" : "Ultra", match[0], match[0].includes("oppo") ? 80 : 65);
    }
    for (const match of compact.matchAll(/(?:vivo)?x?(200|300)(pro|ultra)/g)) {
      add("Vivo", `X${match[1]}`, match[2] === "pro" ? "Pro" : "Ultra", match[0], match[0].includes("vivo") ? 80 : 65);
    }
    for (const match of compact.matchAll(/(?:samsung|galaxy)?s(22|23|24|25|26)(ultra|u)?/g)) {
      const hasVariant = !!match[2];
      add("Samsung", `S${match[1]}`, "Ultra", match[0], hasVariant ? 80 : 50);
      if (!hasVariant) {
        const last = candidates[candidates.length - 1];
        if (last) {
          last.score -= 15;
          last.evidence[0].matchType = "family_inferred";
        }
      }
    }
  }
  return candidates;
}

function detectLens(sources: TextSource[]): LensDetection {
  const withEvidence: PhoneModelEvidence[] = [];
  const withoutEvidence: PhoneModelEvidence[] = [];
  let lensSize: string | null = null;
  for (const source of sources) {
    const text = source.normalized;
    const compact = source.compact;
    const noLens = /ไม่\s*(?:ใส่|ต่อ|ติด|มี|ใช้|เอา)\s*เลนส์|ไม่มี\s*เลนส์|เครื่องเปล่า|no\s*lens|without\s*lens/i.test(text);
    if (noLens) {
      withoutEvidence.push({ text: source.value, sourceField: source.field, matchType: "without_lens" });
    }

    const size = compact.match(/(200|300|400)mm/) ?? text.match(/\b(200|300|400)\s*mm\b/i);
    if (size) lensSize = `${size[1]}mm`;
    const withLens = /\+\s*(?:lens|เลนส์)|ติด\s*เลนส์|พร้อม\s*เลนส์|มี\s*เลนส์|ใส่\s*เลนส์|เลนส์เสริม|tele\s*lens|teleconverter/i.test(text)
      || /\blens\s*(?:200|300|400)?\s*(?:mm)?\b/i.test(text)
      || (/\b(?:oppo|vivo|samsung)\b/.test(text) && /เลนส์|\blens\b/i.test(text))
      || !!size;
    if (withLens) {
      withEvidence.push({ text: source.value, sourceField: source.field, matchType: size ? "lens_size" : "with_lens" });
    }
  }

  if (withoutEvidence.length > 0) {
    return {
      status: "without_lens",
      size: null,
      conflict: withEvidence.length > 0,
      evidence: withoutEvidence,
    };
  }
  if (withEvidence.length > 0) {
    return { status: "with_lens", size: lensSize, conflict: false, evidence: withEvidence };
  }
  return { status: "unknown", size: null, conflict: false, evidence: [] };
}

function contextScore(candidate: ModelCandidate, sourceText: string): number {
  const compact = compactText(sourceText);
  const evidence = compactText(candidate.evidence[0]?.text);
  const pos = evidence ? compact.indexOf(evidence) : -1;
  if (pos < 0) return 0;
  const before = compact.slice(Math.max(0, pos - 30), pos);
  let score = 0;
  if (/ถ่ายด้วย|ใช้รุ่น|กล้องจาก|เช่า|เครื่องนี้|shoton/.test(before)) score += 14;
  if (/เทียบ|เทียบกับ|อยากได้|น่าจะ|ไม่ใช่|ไม่ได้ใช้|คู่แข่ง/.test(before)) score -= 14;
  return score;
}

function selectBestCandidate(candidates: ModelCandidate[], sourceText: string): ModelCandidate | null {
  const valid = candidates
    .filter((c) => c.master)
    .map((c) => ({ ...c, score: c.score + contextScore(c, sourceText) }))
    .sort((a, b) => b.score - a.score);
  return valid[0] ?? null;
}

function detectSuggestedModel(sources: TextSource[]): string | null {
  const compact = sources.map((s) => s.compact).join(" ");
  const compactSamsung = compact.match(/(?:samsung|galaxy)?s(\d{2})ultra/);
  if (compactSamsung) {
    const model = `Samsung S${compactSamsung[1]} Ultra`;
    return findExactMaster(model) ? null : model;
  }
  const compactVivo = compact.match(/(?:vivo)?x?(\d{3})(pro|ultra)/);
  if (compactVivo) {
    const model = `Vivo X${compactVivo[1]} ${compactVivo[2] === "pro" ? "Pro" : "Ultra"}`;
    return findExactMaster(model) ? null : model;
  }
  const compactOppo = compact.match(/(?:oppo)?(?:find)?x(\d{1,2})(pro|ultra)/);
  if (compactOppo) {
    const model = `Oppo Find X${compactOppo[1]} ${compactOppo[2] === "pro" ? "Pro" : "Ultra"}`;
    return findExactMaster(model) ? null : model;
  }
  return null;
}

function makeSources(input: {
  phoneModel?: string | null;
  phoneBrand?: string | null;
  phoneSlug?: string | null;
  texts?: Array<string | null | undefined>;
  sources?: Array<{ field: SourceField; value: string | null | undefined }>;
}): TextSource[] {
  const raw = [
    { field: "phone_model" as const, value: input.phoneModel },
    { field: "phone_slug" as const, value: input.phoneSlug },
    { field: "unknown" as const, value: input.phoneBrand },
    ...(input.sources ?? []),
    ...(input.texts ?? []).map((value) => ({ field: "unknown" as const, value })),
  ];
  return raw
    .filter((item): item is { field: SourceField; value: string } => typeof item.value === "string" && item.value.trim() !== "")
    .map((item) => ({
      field: item.field,
      value: item.value,
      normalized: normalizeText(item.value),
      compact: compactText(item.value),
    }));
}

function fromMaster(master: PhoneModelMaster, lens: LensDetection, candidate: ModelCandidate, rejected: PhoneModelRejectedCandidate[]): PhoneModelNormalization {
  const lensStatus = master.hasLens ? "with_lens" : lens.status;
  const score = Math.max(0, Math.min(100, candidate.score));
  return {
    phone_brand: master.brand,
    phone_model: master.model,
    phone_slug: master.slug,
    lens_status: lensStatus,
    suggested_model: null,
    model_match_status: "canonical",
    confidence: Math.round((score / 100) * 100) / 100,
    needs_review: lens.conflict || score < 70,
    lens_size: lens.size,
    evidence: [...candidate.evidence, ...lens.evidence],
    rejected_candidates: rejected,
  };
}

export function normalizePhoneModel(input: {
  phoneModel?: string | null;
  phoneBrand?: string | null;
  phoneSlug?: string | null;
  texts?: Array<string | null | undefined>;
  sources?: Array<{ field: SourceField; value: string | null | undefined }>;
}): PhoneModelNormalization {
  const sources = makeSources(input);
  const sourceText = sources.map((s) => s.value).join(" ");
  const lens = detectLens(sources);
  const exact = findExactMaster(input.phoneModel) ?? findExactMaster(input.phoneSlug);
  if (exact) {
    return fromMaster(
      exact,
      lens,
      {
        master: exact,
        value: exact.model,
        brand: exact.brand,
        score: 100,
        evidence: [{ text: input.phoneModel ?? input.phoneSlug ?? exact.model, sourceField: "phone_model", matchType: "exact_canonical" }],
      },
      []
    );
  }

  const candidates = [
    ...collectMasterAliasCandidates(sources),
    ...collectPatternCandidates(sources, lens),
  ];
  const best = selectBestCandidate(candidates, sourceText);
  const rejected = candidates
    .filter((c) => !c.master)
    .map((c) => ({ value: c.value, reason: c.rejectedReason ?? "candidate did not match an available master configuration" }));
  if (best?.master) return fromMaster(best.master, lens, best, rejected);

  const brandOnly = collectBrandOnlyCandidate(sources);
  const suggested = detectSuggestedModel(sources);
  return {
    phone_brand: brandOnly?.brand ?? null,
    phone_model: null,
    phone_slug: null,
    lens_status: lens.status === "with_lens" ? "with_lens" : lens.status === "without_lens" ? "without_lens" : "unknown",
    suggested_model: suggested,
    model_match_status: suggested ? "suggested" : "unknown",
    confidence: brandOnly ? 0.25 : suggested ? 0.55 : 0,
    needs_review: true,
    lens_size: lens.size,
    evidence: [...(brandOnly?.evidence ?? []), ...lens.evidence],
    rejected_candidates: rejected,
  };
}

export function normalizeImportRowPhoneFields(row: ImportRow): ImportRow {
  const normalized = normalizePhoneModel({
    phoneBrand: row.phone_brand,
    phoneModel: row.phone_model,
    phoneSlug: row.phone_slug,
    sources: [
      { field: "imported_hint", value: row.model_hint ?? row.import_note ?? row.caption },
      { field: "caption", value: row.caption },
      { field: "post_text", value: row.post_text },
      { field: "hashtags", value: row.hashtags?.join(" ") },
      { field: "summary_th", value: row.summary_th },
    ],
  });
  const summary = row.post_text
    ? buildReviewSummary(row.post_text, normalized.phone_brand, normalized.phone_model)
    : null;
  const postedYear = row.posted_at ? new Date(row.posted_at).getFullYear() : null;
  const year = Number.isFinite(postedYear) ? postedYear : row.year ?? null;

  return {
    ...row,
    phone_brand: normalized.phone_brand,
    phone_model: normalized.phone_model,
    phone_slug: normalized.phone_slug,
    lens_status: normalized.lens_status,
    suggested_model: normalized.suggested_model ?? row.suggested_model ?? null,
    model_match_status: normalized.model_match_status,
    year,
    summary_th: row.summary_th ?? summary ?? null,
    confidence: row.confidence ?? normalized.confidence ?? null,
  };
}
