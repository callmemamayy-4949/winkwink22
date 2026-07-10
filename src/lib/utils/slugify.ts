/** Basic ASCII slugify. Thai text won't romanize — callers should let the
 * admin edit the slug manually when the source text isn't already English. */
export function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
