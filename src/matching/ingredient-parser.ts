import { UNIT_SYNONYM_KEYS_BY_LENGTH, UNIT_SYNONYMS } from './units-dictionary';

export interface ParsedIngredient {
  /** Free-form name, lowercased and trimmed (NOT yet alias-normalized). */
  name: string;
  /** Quantity, or null if not detectable. */
  quantity: number | null;
  /** Canonical unit id (`g`, `ml`, ...) or null. */
  unitId: string | null;
  /** Anything captured between parentheses. */
  note: string | null;
  /** Original input. */
  raw: string;
}

const UNICODE_FRACTIONS: Record<string, number> = {
  '½': 0.5,
  '¼': 0.25,
  '¾': 0.75,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '⅛': 0.125,
};

/**
 * Pre-process a raw string so the rest of the parser sees a stable shape.
 */
function preprocess(raw: string): { working: string; note: string | null } {
  let s = raw.toLowerCase().replace(/ё/g, 'е').trim();

  // Pull out the first parenthesized note.
  let note: string | null = null;
  const noteMatch = s.match(/\(([^)]+)\)/);
  if (noteMatch) {
    note = noteMatch[1].trim();
    s = (s.slice(0, noteMatch.index) + s.slice((noteMatch.index ?? 0) + noteMatch[0].length)).trim();
  }

  // ',' as a decimal separator → '.' (only when between digits).
  s = s.replace(/(\d),(\d)/g, '$1.$2');

  // Replace unicode fractions with explicit values.
  for (const [glyph, value] of Object.entries(UNICODE_FRACTIONS)) {
    s = s.replace(new RegExp(glyph, 'g'), ` ${value} `);
  }

  s = s.replace(/\s+/g, ' ').trim();
  return { working: s, note };
}

/**
 * Try to consume a leading quantity token from `s`. Supports:
 *  - integer `2`
 *  - decimal `0.5`, `1.25`
 *  - fraction `1/2`
 *  - range `2-3` (returns the lower bound)
 */
function consumeQuantity(s: string): { quantity: number | null; rest: string } {
  // Range like "2-3" or "2 - 3"
  const rangeMatch = s.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\b/);
  if (rangeMatch) {
    return { quantity: Number(rangeMatch[1]), rest: s.slice(rangeMatch[0].length).trim() };
  }

  // Fraction "1/2"
  const fracMatch = s.match(/^(\d+)\s*\/\s*(\d+)\b/);
  if (fracMatch) {
    const num = Number(fracMatch[1]);
    const den = Number(fracMatch[2]);
    if (den !== 0) {
      return { quantity: num / den, rest: s.slice(fracMatch[0].length).trim() };
    }
  }

  // Decimal / integer
  const numMatch = s.match(/^(\d+(?:\.\d+)?)\b/);
  if (numMatch) {
    return { quantity: Number(numMatch[1]), rest: s.slice(numMatch[0].length).trim() };
  }

  return { quantity: null, rest: s };
}

/**
 * Consume a unit token from the start of `s`, using the longest matching
 * synonym from the dictionary.
 */
function consumeUnit(s: string): { unitId: string | null; rest: string } {
  for (const key of UNIT_SYNONYM_KEYS_BY_LENGTH) {
    if (s === key || s.startsWith(`${key} `) || s.startsWith(`${key}.`)) {
      let rest = s.slice(key.length);
      if (rest.startsWith('.')) rest = rest.slice(1);
      return { unitId: UNIT_SYNONYMS[key], rest: rest.trim() };
    }
  }
  return { unitId: null, rest: s };
}

/**
 * Parse a free-form ingredient line into a structured object.
 *
 * Example:
 *   parseIngredient("2 ст.л. оливкового масла (extra virgin)")
 *   => { quantity: 2, unitId: 'tbsp', name: 'оливкового масла', note: 'extra virgin', raw: ... }
 */
export function parseIngredient(raw: string): ParsedIngredient {
  const { working, note } = preprocess(raw);

  const { quantity, rest: afterQty } = consumeQuantity(working);
  const { unitId, rest: afterUnit } = consumeUnit(afterQty);

  const name = afterUnit.replace(/\s+/g, ' ').trim();

  return {
    name,
    quantity,
    unitId,
    note,
    raw,
  };
}
