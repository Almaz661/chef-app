/**
 * Free-form unit name → canonical unit id (matches `Unit.id` in the DB).
 *
 * Kept intentionally small and explicit. Keys are normalized (lowercase,
 * `ё→е`) and may contain spaces; lookups try multiple variants in
 * `parseIngredient`.
 */
export const UNIT_SYNONYMS: Record<string, string> = {
  // mass
  г: 'g',
  гр: 'g',
  грамм: 'g',
  граммов: 'g',
  грамма: 'g',
  кг: 'kg',
  килограмм: 'kg',
  килограмма: 'kg',
  килограммов: 'kg',

  // volume
  мл: 'ml',
  миллилитр: 'ml',
  миллилитра: 'ml',
  миллилитров: 'ml',
  л: 'l',
  литр: 'l',
  литра: 'l',
  литров: 'l',

  // spoons (ru common forms)
  'ст л': 'tbsp',
  'ст.л': 'tbsp',
  'ст.л.': 'tbsp',
  'ст ложка': 'tbsp',
  'ст. ложка': 'tbsp',
  'столовая ложка': 'tbsp',
  'столовых ложки': 'tbsp',
  'столовых ложек': 'tbsp',
  'ч л': 'tsp',
  'ч.л': 'tsp',
  'ч.л.': 'tsp',
  'ч ложка': 'tsp',
  'ч. ложка': 'tsp',
  'чайная ложка': 'tsp',
  'чайных ложки': 'tsp',
  'чайных ложек': 'tsp',

  // count
  шт: 'pcs',
  'шт.': 'pcs',
  штука: 'pcs',
  штуки: 'pcs',
  штук: 'pcs',

  // other
  щепотка: 'pinch',
  щепотки: 'pinch',
  щеп: 'pinch',
};

/**
 * Sorted by length descending so multi-token aliases like "столовая ложка"
 * win over a shorter "ст" prefix during left-to-right matching.
 */
export const UNIT_SYNONYM_KEYS_BY_LENGTH = Object.keys(UNIT_SYNONYMS).sort(
  (a, b) => b.length - a.length,
);
