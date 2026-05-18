import { describe, expect, it } from 'bun:test';

import { Batch, Loc, pickBatches } from '../src/cooking/cooking-planner';

const NOW = new Date('2026-05-18T12:00:00Z');

let _id = 0;
const mkBatch = (
  productId: string,
  location: Loc,
  quantity: number,
  expiresAt: string | null,
  acquiredAt: string = '2026-05-01T00:00:00Z',
): Batch => ({
  id: `b${++_id}`,
  productId,
  location,
  quantity,
  expiresAt: expiresAt ? new Date(expiresAt) : null,
  acquiredAt: new Date(acquiredAt),
});

const groupByProduct = (list: Batch[]): Map<string, Batch[]> => {
  const m = new Map<string, Batch[]>();
  for (const b of list) {
    const arr = m.get(b.productId) ?? [];
    arr.push(b);
    m.set(b.productId, arr);
  }
  return m;
};

describe('pickBatches', () => {
  it('drains a single batch fully when need <= batch.quantity', () => {
    const batches = groupByProduct([
      mkBatch('p_milk', 'FRIDGE', 1000, '2026-05-25T00:00:00Z'),
    ]);
    const r = pickBatches({
      needs: [{ productId: 'p_milk', quantity: 250, baseUnitId: 'ml' }],
      batches,
      now: NOW,
    });
    expect(r.ok).toBe(true);
    expect(r.lines).toHaveLength(1);
    expect(r.lines[0].quantity).toBe(250);
    expect(r.lines[0].takes).toHaveLength(1);
    expect(r.lines[0].takes[0].quantity).toBe(250);
    expect(r.lines[0].takes[0].expired).toBe(false);
  });

  it('FEFO: takes the batch with closer expiresAt first', () => {
    const earlier = mkBatch('p_milk', 'FRIDGE', 500, '2026-05-20T00:00:00Z');
    const later = mkBatch('p_milk', 'FRIDGE', 500, '2026-05-30T00:00:00Z');
    const batches = groupByProduct([later, earlier]); // intentionally reversed
    const r = pickBatches({
      needs: [{ productId: 'p_milk', quantity: 600, baseUnitId: 'ml' }],
      batches,
      now: NOW,
    });
    expect(r.ok).toBe(true);
    expect(r.lines[0].takes.map((t) => t.batchId)).toEqual([earlier.id, later.id]);
    expect(r.lines[0].takes[0].quantity).toBe(500);
    expect(r.lines[0].takes[1].quantity).toBe(100);
  });

  it('batch without expiresAt goes AFTER batches with expiresAt', () => {
    const dated = mkBatch('p_flour', 'PANTRY', 200, '2026-06-01T00:00:00Z');
    const undated = mkBatch('p_flour', 'PANTRY', 200, null);
    const batches = groupByProduct([undated, dated]);
    const r = pickBatches({
      needs: [{ productId: 'p_flour', quantity: 250, baseUnitId: 'g' }],
      batches,
      now: NOW,
    });
    expect(r.lines[0].takes.map((t) => t.batchId)).toEqual([dated.id, undated.id]);
    expect(r.lines[0].takes[0].quantity).toBe(200);
    expect(r.lines[0].takes[1].quantity).toBe(50);
  });

  it('expired batch is consumed first and marked as expired', () => {
    const expired = mkBatch('p_yog', 'FRIDGE', 300, '2026-05-10T00:00:00Z');
    const fresh = mkBatch('p_yog', 'FRIDGE', 300, '2026-05-25T00:00:00Z');
    const batches = groupByProduct([fresh, expired]);
    const r = pickBatches({
      needs: [{ productId: 'p_yog', quantity: 100, baseUnitId: 'g' }],
      batches,
      now: NOW,
    });
    expect(r.lines[0].takes).toHaveLength(1);
    expect(r.lines[0].takes[0].batchId).toBe(expired.id);
    expect(r.lines[0].takes[0].expired).toBe(true);
  });

  it('preferLocation drains preferred location first', () => {
    const fridge = mkBatch('p_oil', 'FRIDGE', 100, '2026-06-01T00:00:00Z');
    const pantry = mkBatch('p_oil', 'PANTRY', 100, '2026-06-01T00:00:00Z');
    const batches = groupByProduct([fridge, pantry]);
    const r = pickBatches({
      needs: [{ productId: 'p_oil', quantity: 50, baseUnitId: 'ml' }],
      batches,
      now: NOW,
      preferLocation: 'FRIDGE',
    });
    expect(r.lines[0].takes[0].location).toBe('FRIDGE');
  });

  it('falls through to next location when preferred is exhausted', () => {
    const fridge = mkBatch('p_oil', 'FRIDGE', 30, '2026-06-01T00:00:00Z');
    const pantry = mkBatch('p_oil', 'PANTRY', 100, '2026-06-01T00:00:00Z');
    const batches = groupByProduct([fridge, pantry]);
    const r = pickBatches({
      needs: [{ productId: 'p_oil', quantity: 80, baseUnitId: 'ml' }],
      batches,
      now: NOW,
      preferLocation: 'FRIDGE',
    });
    expect(r.lines[0].takes.map((t) => t.location)).toEqual(['FRIDGE', 'PANTRY']);
    expect(r.lines[0].takes[0].quantity).toBe(30);
    expect(r.lines[0].takes[1].quantity).toBe(50);
  });

  it('insufficient stock → ok=false, lines empty, shortage reported', () => {
    const batches = groupByProduct([mkBatch('p_milk', 'FRIDGE', 100, null)]);
    const r = pickBatches({
      needs: [{ productId: 'p_milk', quantity: 200, baseUnitId: 'ml' }],
      batches,
      now: NOW,
    });
    expect(r.ok).toBe(false);
    expect(r.lines).toEqual([]);
    expect(r.shortages).toEqual([{ productId: 'p_milk', need: 200, have: 100 }]);
  });

  it('all-or-nothing: any shortage clears all lines', () => {
    const batches = groupByProduct([
      mkBatch('p_tomato', 'PANTRY', 100, null),
      mkBatch('p_salt', 'PANTRY', 1, null),
    ]);
    const r = pickBatches({
      needs: [
        { productId: 'p_tomato', quantity: 10, baseUnitId: 'g' },   // ok
        { productId: 'p_salt', quantity: 1000, baseUnitId: 'g' },   // short
      ],
      batches,
      now: NOW,
    });
    expect(r.ok).toBe(false);
    expect(r.lines).toEqual([]);
    expect(r.shortages).toEqual([{ productId: 'p_salt', need: 1000, have: 1 }]);
  });

  it('equal expiresAt → tiebreak by acquiredAt asc', () => {
    const newer = mkBatch('p_milk', 'FRIDGE', 100, '2026-06-01T00:00:00Z', '2026-05-15T00:00:00Z');
    const older = mkBatch('p_milk', 'FRIDGE', 100, '2026-06-01T00:00:00Z', '2026-05-05T00:00:00Z');
    const batches = groupByProduct([newer, older]);
    const r = pickBatches({
      needs: [{ productId: 'p_milk', quantity: 50, baseUnitId: 'ml' }],
      batches,
      now: NOW,
    });
    expect(r.lines[0].takes[0].batchId).toBe(older.id);
  });

  it('zero-quantity needs are skipped silently', () => {
    const batches = groupByProduct([mkBatch('p_tomato', 'PANTRY', 100, null)]);
    const r = pickBatches({
      needs: [
        { productId: 'p_tomato', quantity: 50, baseUnitId: 'g' },
        { productId: 'p_salt', quantity: 0, baseUnitId: 'g' },
      ],
      batches,
      now: NOW,
    });
    expect(r.ok).toBe(true);
    expect(r.lines).toHaveLength(1);
    expect(r.lines[0].productId).toBe('p_tomato');
  });

  it('lines are returned sorted by productId for determinism', () => {
    const batches = groupByProduct([
      mkBatch('p_tomato', 'PANTRY', 100, null),
      mkBatch('p_oil', 'PANTRY', 100, null),
      mkBatch('p_salt', 'PANTRY', 100, null),
    ]);
    const r = pickBatches({
      needs: [
        { productId: 'p_tomato', quantity: 1, baseUnitId: 'g' },
        { productId: 'p_oil', quantity: 1, baseUnitId: 'ml' },
        { productId: 'p_salt', quantity: 1, baseUnitId: 'g' },
      ],
      batches,
      now: NOW,
    });
    expect(r.lines.map((l) => l.productId)).toEqual(['p_oil', 'p_salt', 'p_tomato']);
  });
});
