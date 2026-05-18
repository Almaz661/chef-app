/**
 * Normalize a piece of free-form ingredient text for matching purposes.
 *
 * The output is lowercase, trimmed, with `ё` folded to `е`, common
 * punctuation removed, and whitespace collapsed.
 *
 * This MUST be deterministic — the same string used both at write time
 * (storing aliases) and at read time (matching) so equality comparisons hold.
 */
export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[«»"'`]/g, '')
    .replace(/[.,;:!?()[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
