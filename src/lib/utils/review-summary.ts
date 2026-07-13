function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function uniqueNonEmpty(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => !!value))];
}

function removeModelTerms(text: string, brand: string | null, model: string | null): string {
  let cleaned = text;
  const modelParts = uniqueNonEmpty([
    brand,
    model,
    model?.replace(/\+?\s*Lens\s*\d+\s*mm/gi, ""),
    model?.replace(brand ?? "", ""),
  ]);

  for (const part of modelParts.sort((a, b) => b.length - a.length)) {
    cleaned = cleaned.replace(new RegExp(escapeRegExp(part), "gi"), " ");
    cleaned = cleaned.replace(new RegExp(escapeRegExp(part).replace(/\\ /g, "\\s*"), "gi"), " ");
  }

  return cleaned
    .replace(/\b(?:samsung|galaxy|vivo|oppo)\b/gi, " ")
    .replace(/\b(?:find\s*)?x\s*\d{1,3}\s*(?:pro|ultra)\b/gi, " ")
    .replace(/\bs\s*\d{2}\s*ultra\b/gi, " ")
    .replace(/\b(?:vivo|oppo)?x\d{1,3}(?:pro|ultra)\b/gi, " ")
    .replace(/\b(?:samsung|galaxy)?s\d{2}ultra\b/gi, " ");
}

export function cleanReviewTextForSummary(text: string, brand: string | null = null, model: string | null = null): string {
  return removeModelTerms(text, brand, model)
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/@\w+/g, " ")
    .replace(/#[\wก-๙]+/gu, " ")
    .replace(/\b(?:lens|เลนส์)\s*\d+\s*(?:mm)?\b/gi, " ")
    .replace(/\b\d+\s*mm\b/gi, " ")
    .replace(/\+\s*(?:lens|เลนส์)/gi, " ")
    .replace(/(?:พร้อม|มี|ใช้|ต่อ)?\s*(?:เลนส์เสริม|เลนส์)/gi, " ")
    .replace(/(?:ไม่มี|ไม่ใช้|ไม่ต่อ)\s*เลนส์/gi, " ")
    .replace(/รีวิว(?:วิ้งวิ้ง30|เช่าwinkwink)?/gi, " ")
    .replace(/[^\p{L}\p{N}\s.,!?:/%+\-]/gu, " ")
    .replace(/([ก-๙])\1{3,}/gu, "$1$1")
    .replace(/([a-zA-Z])\1{3,}/g, "$1$1")
    .replace(/\s+/g, " ")
    .trim();
}

function compactSummary(text: string): string | null {
  const cleaned = text.trim();
  if (!cleaned || cleaned.length < 10) return null;

  const positive = /ดี|ชัด|สวย|คม|ซูม|ไกล|ประทับใจ|เริ่ด|ปัง|แนะนำ|ชอบ|ละเอียด|เวที|แสง/i.test(cleaned);
  const mentionsStage = /เวที|สเตจ|stage|คอน|concert|โซน|แถว|ดอย|ชั้น|impact/i.test(cleaned);
  const mentionsImage = /ภาพ|คลิป|วิดีโอ|รูป|ถ่าย|ซูม|ชัด|คม|แสง/i.test(cleaned);

  if (mentionsStage && mentionsImage && /ซูม|ไกล/i.test(cleaned)) {
    return "มุมมองเวทีชัด ซูมได้ไกล ประทับใจมาก";
  }
  if (mentionsImage && /คม|ชัด|ละเอียด/i.test(cleaned)) {
    return "ภาพคมชัด เห็นรายละเอียดเวทีได้ดี";
  }
  if (mentionsImage && /สวย|แสง/i.test(cleaned)) {
    return "ภาพสวย แสงดี เก็บบรรยากาศได้ชัด";
  }
  if (/บริการ|แม่ค้า|ร้าน|ส่ง|รับ|แนะนำ/i.test(cleaned)) {
    return positive ? "ร้านบริการดี ใช้งานแล้วประทับใจ" : "ประสบการณ์เช่าราบรื่น ใช้งานสะดวก";
  }
  if (mentionsStage) {
    return "มุมมองจากที่นั่งเห็นเวทีได้ชัดเจน";
  }
  if (positive) {
    return "ใช้งานดี ภาพชัด น่าประทับใจ";
  }

  return cleaned.split(/[.!?\n。]|(?:\s{2,})/)[0]?.trim() || cleaned;
}

export function buildReviewSummary(text: string, brand: string | null = null, model: string | null = null): string | null {
  const compacted = compactSummary(cleanReviewTextForSummary(text, brand, model));
  if (!compacted) return null;
  return compacted;
}
