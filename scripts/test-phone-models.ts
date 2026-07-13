import assert from "node:assert/strict";
import { normalizePhoneModel } from "../src/lib/utils/phone-models";

const cases = [
  {
    name: "compact Oppo hashtag",
    input: { sources: [{ field: "hashtags" as const, value: "#OppoFindX9Ultra" }] },
    model: "Oppo Find X9 Ultra",
    lens: "unknown",
  },
  {
    name: "does not stop at unavailable first candidate",
    input: { texts: ["มีทั้ง findx9pro ในข้อความ แต่ใช้ #OppoFindX9Ultra"] },
    model: "Oppo Find X9 Ultra",
    lens: "unknown",
  },
  {
    name: "Samsung S26 Ultra",
    input: { texts: ["S26 Ultra ถ่ายสวยมาก"] },
    model: "Samsung S26 Ultra",
    lens: "unknown",
  },
  {
    name: "Samsung S26 family inference stays reviewable",
    input: { texts: ["S26"] },
    model: "Samsung S26 Ultra",
    lens: "unknown",
    needsReview: true,
  },
  {
    name: "Samsung S26 lens inference stays reviewable",
    input: { texts: ["S26 + Lens"] },
    model: "Samsung S26 Ultra",
    lens: "with_lens",
    needsReview: true,
  },
  {
    name: "brand and lens only does not create model",
    input: { texts: ["ออปโป้+เลนส์"] },
    model: null,
    brand: "Oppo",
    lens: "with_lens",
    needsReview: true,
  },
  {
    name: "brand lens plus hashtag resolves model",
    input: {
      sources: [
        { field: "post_text" as const, value: "ออปโป้+เลนส์" },
        { field: "hashtags" as const, value: "#OppoFindX9Ultra" },
      ],
    },
    model: "Oppo Find X9 Ultra",
    lens: "with_lens",
  },
  {
    name: "hyphenated Oppo",
    input: { texts: ["oppo-find-x9-ultra"] },
    model: "Oppo Find X9 Ultra",
    lens: "unknown",
  },
  {
    name: "compact Oppo",
    input: { texts: ["OppoFindX9Ultra"] },
    model: "Oppo Find X9 Ultra",
    lens: "unknown",
  },
  {
    name: "specific no lens wins",
    input: { texts: ["Oppo Find X9 Ultra ไม่ใส่เลนส์"] },
    model: "Oppo Find X9 Ultra",
    lens: "without_lens",
  },
  {
    name: "context chooses shot-on model",
    input: { texts: ["เทียบ Oppo Find X9 Pro แต่คลิปนี้ถ่ายด้วย Vivo X300 Ultra"] },
    model: "Vivo X300 Ultra",
    lens: "unknown",
  },
  {
    name: "Samsung S26U with lens size",
    input: { texts: ["Samsung S26U 200mm"] },
    model: "Samsung S26 Ultra",
    lens: "with_lens",
    lensSize: "200mm",
  },
];

for (const item of cases) {
  const result = normalizePhoneModel(item.input);
  assert.equal(result.phone_model, item.model, item.name);
  if ("brand" in item) assert.equal(result.phone_brand, item.brand, item.name);
  assert.equal(result.lens_status, item.lens, item.name);
  if ("needsReview" in item) assert.equal(result.needs_review, item.needsReview, item.name);
  if ("lensSize" in item) assert.equal(result.lens_size, item.lensSize, item.name);
}

console.log(`phone model detector: ${cases.length} cases passed`);
