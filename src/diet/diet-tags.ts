/**
 * Pure helpers for dietary-tag compatibility checks.
 *
 * Tags themselves are arbitrary strings (e.g. "vegan", "gluten_free").
 * Phase 6 deliberately does NOT enforce a closed enum — projects often
 * extend the vocabulary (`kosher`, `halal`, `low_fodmap`, ...).
 */

/**
 * A product is compatible with a diet iff EVERY required tag is present
 * on the product. Empty `requiredTags` means "no diet constraint" => true.
 */
export function tagsAreCompatible(
  productTags: readonly string[],
  requiredTags: readonly string[],
): boolean {
  if (requiredTags.length === 0) return true;
  if (productTags.length === 0) return false;
  const set = new Set(productTags);
  for (const t of requiredTags) {
    if (!set.has(t)) return false;
  }
  return true;
}

/**
 * Filter helper. Returns the subset of `ingredients` that does NOT
 * satisfy `requiredTags`. Order is preserved so the API response stays
 * predictable.
 */
export function findIncompatibleIngredients<T extends { tags: readonly string[] }>(
  ingredients: readonly T[],
  requiredTags: readonly string[],
): T[] {
  if (requiredTags.length === 0) return [];
  return ingredients.filter((i) => !tagsAreCompatible(i.tags, requiredTags));
}

/**
 * Parse the comma-separated `tags` query parameter ("vegan,gluten_free")
 * into a deduped trimmed array. Lowercases for case-insensitive matching.
 * Empty/undefined input → [].
 */
export function parseTagsQuery(raw: string | undefined): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of raw.split(',')) {
    const trimmed = t.trim().toLowerCase();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}
