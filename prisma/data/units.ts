/**
 * Static unit catalog. Kept free of `@prisma/client` so it can be imported
 * by tests in environments where the generated client isn't present
 * (e.g. the sandbox runner).
 *
 * `kind` is a plain string union here; seed.ts maps it to the Prisma
 * `UnitKind` enum at write time.
 */

export type UnitKindLiteral = 'MASS' | 'VOLUME' | 'COUNT' | 'OTHER';

export interface UnitDef {
  id: string;
  name: string;
  kind: UnitKindLiteral;
}

export const UNITS: UnitDef[] = [
  { id: 'g', name: 'грамм', kind: 'MASS' },
  { id: 'kg', name: 'килограмм', kind: 'MASS' },
  { id: 'ml', name: 'миллилитр', kind: 'VOLUME' },
  { id: 'l', name: 'литр', kind: 'VOLUME' },
  { id: 'tbsp', name: 'столовая ложка', kind: 'VOLUME' },
  { id: 'tsp', name: 'чайная ложка', kind: 'VOLUME' },
  { id: 'pcs', name: 'штука', kind: 'COUNT' },
  { id: 'pinch', name: 'щепотка', kind: 'OTHER' },
];

/** Conversions independent of a product — pure unit math. */
export const GLOBAL_CONVERSIONS: Array<{ from: string; to: string; factor: number }> = [
  { from: 'kg', to: 'g', factor: 1000 },
  { from: 'g', to: 'kg', factor: 0.001 },
  { from: 'l', to: 'ml', factor: 1000 },
  { from: 'ml', to: 'l', factor: 0.001 },
];
