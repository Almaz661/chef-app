/**
 * Run with: bun test test/parser.spec.ts
 * (or: npm run test, which uses vitest, once dependencies are installed)
 */
import { describe, expect, it } from 'bun:test';

import { parseIngredient } from '../src/matching/ingredient-parser';
import { normalizeText } from '../src/matching/text-normalize';

describe('normalizeText', () => {
  it('lowercases, folds ё→е, strips punctuation', () => {
    expect(normalizeText('Ёлочные Шарики, золотые!')).toBe('елочные шарики золотые');
  });

  it('collapses whitespace and trims', () => {
    expect(normalizeText('  оливковое   масло  ')).toBe('оливковое масло');
  });

  it('strips quotes', () => {
    expect(normalizeText('«Соль» поваренная')).toBe('соль поваренная');
  });
});

describe('parseIngredient', () => {
  it('parses "2 ст.л. оливкового масла"', () => {
    const r = parseIngredient('2 ст.л. оливкового масла');
    expect(r.quantity).toBe(2);
    expect(r.unitId).toBe('tbsp');
    expect(r.name).toBe('оливкового масла');
    expect(r.note).toBeNull();
  });

  it('parses "300 г помидоров"', () => {
    const r = parseIngredient('300 г помидоров');
    expect(r.quantity).toBe(300);
    expect(r.unitId).toBe('g');
    expect(r.name).toBe('помидоров');
  });

  it('parses "щепотка соли" — no quantity, unit only', () => {
    const r = parseIngredient('щепотка соли');
    expect(r.quantity).toBeNull();
    expect(r.unitId).toBe('pinch');
    expect(r.name).toBe('соли');
  });

  it('parses "1/2 ч.л. соли" — fraction', () => {
    const r = parseIngredient('1/2 ч.л. соли');
    expect(r.quantity).toBe(0.5);
    expect(r.unitId).toBe('tsp');
    expect(r.name).toBe('соли');
  });

  it('parses "0,5 л молока" — comma decimal', () => {
    const r = parseIngredient('0,5 л молока');
    expect(r.quantity).toBe(0.5);
    expect(r.unitId).toBe('l');
    expect(r.name).toBe('молока');
  });

  it('parses "½ стакана воды" — unicode fraction, unknown unit', () => {
    const r = parseIngredient('½ стакана воды');
    expect(r.quantity).toBe(0.5);
    // 'стакан' is intentionally NOT in the dictionary in phase 1.
    expect(r.unitId).toBeNull();
    expect(r.name).toBe('стакана воды');
  });

  it('parses "2-3 кг муки" — range, takes lower bound', () => {
    const r = parseIngredient('2-3 кг муки');
    expect(r.quantity).toBe(2);
    expect(r.unitId).toBe('kg');
    expect(r.name).toBe('муки');
  });

  it('extracts a parenthesized note', () => {
    const r = parseIngredient('100 мл оливкового масла (extra virgin)');
    expect(r.quantity).toBe(100);
    expect(r.unitId).toBe('ml');
    expect(r.name).toBe('оливкового масла');
    expect(r.note).toBe('extra virgin');
  });

  it('handles "1 шт. лук" — pcs unit', () => {
    const r = parseIngredient('1 шт. лук');
    expect(r.quantity).toBe(1);
    expect(r.unitId).toBe('pcs');
    expect(r.name).toBe('лук');
  });

  it('preserves raw input', () => {
    const raw = '2 ст.л. оливкового масла';
    const r = parseIngredient(raw);
    expect(r.raw).toBe(raw);
  });

  it('handles ё in product name', () => {
    const r = parseIngredient('1 шт. свёкла');
    expect(r.quantity).toBe(1);
    expect(r.unitId).toBe('pcs');
    expect(r.name).toBe('свекла'); // ё folded
  });

  it('multi-token unit "столовая ложка" wins over short prefixes', () => {
    const r = parseIngredient('1 столовая ложка сахара');
    expect(r.quantity).toBe(1);
    expect(r.unitId).toBe('tbsp');
    expect(r.name).toBe('сахара');
  });

  it('returns nulls for empty string', () => {
    const r = parseIngredient('');
    expect(r.quantity).toBeNull();
    expect(r.unitId).toBeNull();
    expect(r.name).toBe('');
  });

  it('handles plain product without quantity/unit', () => {
    const r = parseIngredient('куркума');
    expect(r.quantity).toBeNull();
    expect(r.unitId).toBeNull();
    expect(r.name).toBe('куркума');
  });
});
