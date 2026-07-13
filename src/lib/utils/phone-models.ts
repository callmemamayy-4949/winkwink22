import type { ImportRow, LensStatus, ModelMatchStatus } from "@/types/review";
import { slugify } from "@/lib/utils/slugify";

export interface PhoneModelMaster {
  brand: "Samsung" | "Vivo" | "Oppo";
  model: string;
  slug: string;
  hasLens: boolean;
}

export interface PhoneModelNormalization {
  phone_brand: string | null;
  phone_model: string | null;
  phone_slug: string | null;
  lens_status: LensStatus;
  suggested_model: string | null;
  model_match_status: ModelMatchStatus;
}

export const PHONE_MODEL_MASTER_LIST: PhoneModelMaster[] = [
  { brand: "Samsung", model: "Samsung S22 Ultra", slug: "samsung-s22-ultra", hasLens: false },
  { brand: "Samsung", model: "Samsung S23 Ultra", slug: "samsung-s23-ultra", hasLens: false },
  { brand: "Samsung", model: "Samsung S24 Ultra", slug: "samsung-s24-ultra", hasLens: false },
  { brand: "Samsung", model: "Samsung S25 Ultra", slug: "samsung-s25-ultra", hasLens: false },
  { brand: "Samsung", model: "Samsung S26 Ultra", slug: "samsung-s26-ultra", hasLens: false },
  { brand: "Vivo", model: "Vivo X200 Pro", slug: "vivo-x200-pro", hasLens: false },
  { brand: "Vivo", model: "Vivo X200 Ultra", slug: "vivo-x200-ultra", hasLens: false },
  { brand: "Vivo", model: "Vivo X200 Ultra + Lens 200mm", slug: "vivo-x200-ultra-lens-200mm", hasLens: true },
  { brand: "Vivo", model: "Vivo X300 Pro", slug: "vivo-x300-pro", hasLens: false },
  { brand: "Vivo", model: "Vivo X300 Pro + Lens 200mm", slug: "vivo-x300-pro-lens-200mm", hasLens: true },
  { brand: "Vivo", model: "Vivo X300 Ultra", slug: "vivo-x300-ultra", hasLens: false },
  { brand: "Vivo", model: "Vivo X300 Ultra + Lens 400mm", slug: "vivo-x300-ultra-lens-400mm", hasLens: true },
  { brand: "Oppo", model: "Oppo Find X9 Pro + Lens 200mm", slug: "oppo-find-x9-pro-lens-200mm", hasLens: true },
  { brand: "Oppo", model: "Oppo Find X9 Ultra", slug: "oppo-find-x9-ultra", hasLens: false },
  { brand: "Oppo", model: "Oppo Find X9 Ultra + Lens 300mm", slug: "oppo-find-x9-ultra-lens-300mm", hasLens: true },
];

const MASTER_BY_KEY = new Map(PHONE_MODEL_MASTER_LIST.map((m) => [modelKey(m.model), m]));
const MASTER_BY_SLUG = new Map(PHONE_MODEL_MASTER_LIST.map((m) => [m.slug, m]));

function modelKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/เลนส์/g, "lens")
    .replace(/[^a-z0-9]+/g, "");
}

function compactText(text: string): string {
  return modelKey(text);
}

function hasExplicitNoLens(text: string): boolean {
  return /ไม่\s*(?:ต่อ|ติด|มี|เอา|ใช้)\s*เลนส์|no\s*lens|without\s*lens/i.test(text);
}

function hasLensMention(text: string): boolean {
  if (hasExplicitNoLens(text)) return false;
  return /เลนส์เสริม|พร้อม\s*เลนส์|ชุด\s*เลนส์|\+\s*(?:lens|เลนส์)|with\s*lens|\blens\s*\d+\s*(?:mm)?\b|\b(?:200|300|400)\s*mm\b|\b(?:200|300|400)mm\b|\blens\b|เลนส์/i.test(text);
}

function findExactMaster(value: string | null | undefined): PhoneModelMaster | null {
  const text = value?.trim();
  if (!text) return null;
  return MASTER_BY_KEY.get(modelKey(text)) ?? MASTER_BY_SLUG.get(slugify(text)) ?? null;
}

function pickByLens(baseModel: string, wantsLens: boolean, noLens: boolean): PhoneModelMaster | null {
  const matches = PHONE_MODEL_MASTER_LIST.filter((m) => modelKey(m.model).startsWith(modelKey(baseModel)));
  if (matches.length === 0) return null;
  if (noLens) return matches.find((m) => !m.hasLens) ?? null;
  if (wantsLens) return matches.find((m) => m.hasLens) ?? matches.find((m) => !m.hasLens) ?? null;
  return matches.find((m) => !m.hasLens) ?? (matches.length === 1 ? matches[0] : null);
}

function detectKnownModel(text: string, wantsLens: boolean, noLens: boolean): PhoneModelMaster | null {
  const compact = compactText(text);

  for (const year of ["22", "23", "24", "25", "26"]) {
    if (compact.includes(`samsungs${year}ultra`) || compact.includes(`galaxys${year}ultra`) || compact.includes(`s${year}ultra`) || compact.includes(`samsungs${year}`)) {
      return pickByLens(`Samsung S${year} Ultra`, wantsLens, noLens);
    }
  }

  for (const series of ["200", "300"]) {
    for (const tier of ["pro", "ultra"] as const) {
      if (compact.includes(`vivox${series}${tier}`) || compact.includes(`x${series}${tier}`)) {
        return pickByLens(`Vivo X${series} ${tier === "pro" ? "Pro" : "Ultra"}`, wantsLens, noLens);
      }
    }
  }

  for (const tier of ["pro", "ultra"] as const) {
    if (
      compact.includes(`oppofindx9${tier}`) ||
      compact.includes(`findx9${tier}`) ||
      compact.includes(`oppox9${tier}`)
    ) {
      return pickByLens(`Oppo Find X9 ${tier === "pro" ? "Pro" : "Ultra"}`, wantsLens, noLens);
    }
  }

  return null;
}

function detectSuggestedModel(text: string): string | null {
  const compact = compactText(text);
  const compactSamsung = compact.match(/(?:samsung|galaxy)?s(\d{2})ultra/);
  if (compactSamsung) {
    const model = `Samsung S${compactSamsung[1]} Ultra`;
    return findExactMaster(model) ? null : model;
  }

  const compactVivo = compact.match(/(?:vivo)?x(\d{3})(pro|ultra)/);
  if (compactVivo) {
    const model = `Vivo X${compactVivo[1]} ${compactVivo[2] === "pro" ? "Pro" : "Ultra"}`;
    return findExactMaster(model) ? null : model;
  }

  const compactOppo = compact.match(/(?:oppo)?(?:find)?x(\d{1,2})(pro|ultra)/);
  if (compactOppo) {
    const model = `Oppo Find X${compactOppo[1]} ${compactOppo[2] === "pro" ? "Pro" : "Ultra"}`;
    return findExactMaster(model) ? null : model;
  }

  const samsung = text.match(/(?:samsung\s*)?(?:galaxy\s*)?s\s*(\d{2})\s*ultra/i);
  if (samsung) {
    const model = `Samsung S${samsung[1]} Ultra`;
    return findExactMaster(model) ? null : model;
  }

  const vivo = text.match(/(?:vivo\s*)?x\s*(\d{3})\s*(pro|ultra)/i);
  if (vivo) {
    const model = `Vivo X${vivo[1]} ${vivo[2].toLowerCase() === "pro" ? "Pro" : "Ultra"}`;
    return findExactMaster(model) ? null : model;
  }

  const oppo = text.match(/(?:oppo\s*)?(?:find\s*)?x\s*(\d{1,2})\s*(pro|ultra)/i);
  if (oppo) {
    const model = `Oppo Find X${oppo[1]} ${oppo[2].toLowerCase() === "pro" ? "Pro" : "Ultra"}`;
    return findExactMaster(model) ? null : model;
  }

  return null;
}

function fromMaster(master: PhoneModelMaster, fallbackLens: LensStatus = "unknown"): PhoneModelNormalization {
  return {
    phone_brand: master.brand,
    phone_model: master.model,
    phone_slug: master.slug,
    lens_status: master.hasLens ? "with_lens" : fallbackLens === "with_lens" ? "unknown" : fallbackLens,
    suggested_model: null,
    model_match_status: "canonical",
  };
}

export function normalizePhoneModel(input: {
  phoneModel?: string | null;
  phoneBrand?: string | null;
  phoneSlug?: string | null;
  texts?: Array<string | null | undefined>;
}): PhoneModelNormalization {
  const manual = findExactMaster(input.phoneModel) ?? findExactMaster(input.phoneSlug);
  if (manual) return fromMaster(manual, manual.hasLens ? "with_lens" : "unknown");

  const parts = [
    input.phoneBrand,
    input.phoneModel,
    input.phoneSlug,
    ...(input.texts ?? []),
  ].filter((v): v is string => typeof v === "string" && v.trim() !== "");
  const text = parts.join("\n");
  const noLens = hasExplicitNoLens(text);
  const wantsLens = hasLensMention(text);
  const known = detectKnownModel(text, wantsLens, noLens);
  if (known) return fromMaster(known, noLens ? "without_lens" : wantsLens ? "with_lens" : "unknown");

  return {
    phone_brand: null,
    phone_model: null,
    phone_slug: null,
    lens_status: noLens ? "without_lens" : wantsLens ? "unknown" : "unknown",
    suggested_model: detectSuggestedModel(text),
    model_match_status: detectSuggestedModel(text) ? "suggested" : "unknown",
  };
}

export function normalizeImportRowPhoneFields(row: ImportRow): ImportRow {
  const normalized = normalizePhoneModel({
    phoneBrand: row.phone_brand,
    phoneModel: row.phone_model,
    phoneSlug: row.phone_slug,
    texts: [row.model_hint, row.import_note, row.caption, row.summary_th, row.post_text],
  });

  return {
    ...row,
    phone_brand: normalized.phone_brand,
    phone_model: normalized.phone_model,
    phone_slug: normalized.phone_slug,
    lens_status: normalized.lens_status,
    suggested_model: normalized.suggested_model ?? row.suggested_model ?? null,
    model_match_status: normalized.model_match_status,
  };
}
