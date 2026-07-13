import { getAdminSupabase } from "@/lib/supabase/admin";
import { PHONE_MODEL_MASTER_LIST } from "@/lib/utils/phone-models";
import type { PhoneModelOption } from "@/types/review";

type PhoneModelRow = {
  id: string;
  brand: string;
  model_name: string;
  model_slug: string;
  aliases: string[] | null;
  lens_compatible: boolean;
  default_lens_detail: string | null;
};

function toPhoneModelOption(row: PhoneModelRow): PhoneModelOption {
  return {
    id: row.id,
    brand: row.brand,
    model_name: row.model_name,
    model_slug: row.model_slug,
    aliases: Array.isArray(row.aliases) ? row.aliases : [],
    lens_compatible: row.lens_compatible,
    default_lens_detail: row.default_lens_detail,
  };
}

export function getFallbackPhoneModelOptions(): PhoneModelOption[] {
  return PHONE_MODEL_MASTER_LIST.map((model) => ({
    id: `fallback-${model.slug}`,
    brand: model.brand,
    model_name: model.model,
    model_slug: model.slug,
    aliases: [],
    lens_compatible: model.hasLens,
    default_lens_detail: model.hasLens ? model.model.match(/Lens\s+(\d+mm)/i)?.[1] ?? null : null,
  }));
}

export async function getActivePhoneModelOptions(): Promise<PhoneModelOption[]> {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from("phone_model_master")
    .select("id, brand, model_name, model_slug, aliases, lens_compatible, default_lens_detail")
    .eq("active", true)
    .order("brand", { ascending: true })
    .order("model_name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as PhoneModelRow[]).map(toPhoneModelOption);
}
