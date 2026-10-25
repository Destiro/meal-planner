import {
  addExtra,
  applyEdits,
  editRow,
  entryFromText,
  entryToText,
  pruneWeeks,
  removedCount,
  removeRow,
  resetRow,
  restoreRemoved,
  setChecked,
} from '../shoppingEdits';
import { itemKey, ShoppingItem } from '../shopping';
import { ShoppingEdits } from '../types';

const WEEK = '2026-10-12';
const rice: ShoppingItem = { name: 'rice', quantity: 700, unit: 'g', aisle: 'Pantry' };
const tofu: ShoppingItem = { name: 'tofu', quantity: 1, unit: '', aisle: 'Dairy & chilled' };
const planned = [rice, tofu];
const none: ShoppingEdits = {};

describe('entryFromText / entryToText', () => {
  it('reads amounts, defaults to one, and converts to base units', () => {
    expect(entryFromText('2 kg rice')).toEqual({ name: 'rice', quantity: 2000, unit: 'g' });
    expect(entryFromText('bin bags')).toEqual({ name: 'bin bags', quantity: 1, unit: '' });
    expect(entryFromText('3 eggs')).toEqual({ name: 'eggs', quantity: 3, unit: '' });
    expect(entryFromText('   ')).toBeNull();
  });

  it('round-trips through the text form', () => {
    for (const text of ['rice', '700 g rice', '3 eggs']) {
      expect(entryToText(entryFromText(text)!)).toBe(text);
    }
  });
});

describe('applyEdits', () => {
  it('returns the planned items unchanged when there are no edits', () => {
    const rows = applyEdits(planned);
    expect(rows.map((r) => [r.name, r.edited, r.kind])).toEqual([
      ['rice', false, 'planned'],
      ['tofu', false, 'planned'],
    ]);
  });

  it('applies overrides, hides removed items and adds hand-written ones, sorted by name', () => {
    let edits = editRow(none, WEEK, { key: itemKey(rice), kind: 'planned' }, { name: 'brown rice', quantity: 500, unit: 'g' });
    edits = removeRow(edits, WEEK, { key: itemKey(tofu), kind: 'planned' });
    edits = addExtra(edits, WEEK, { name: 'bin bags', quantity: 1, unit: '' }, 'a1');

    const rows = applyEdits(planned, edits[WEEK]);
    expect(rows.map((r) => r.name)).toEqual(['bin bags', 'brown rice']);
    expect(rows[1]).toMatchObject({ key: itemKey(rice), edited: true, quantity: 500, aisle: 'Pantry' });
    expect(rows[0]).toMatchObject({ key: 'extra:a1', kind: 'extra' });
    expect(removedCount(planned, edits[WEEK])).toBe(1);
  });
});

describe('editRow / removeRow for hand-added items', () => {
  it('edits and deletes them by id', () => {
    let edits = addExtra(none, WEEK, { name: 'bags', quantity: 1, unit: '' }, 'x');
    edits = editRow(edits, WEEK, { key: 'extra:x', kind: 'extra' }, { name: 'bin bags', quantity: 2, unit: '' });
    expect(edits[WEEK].extras).toEqual([{ id: 'x', name: 'bin bags', quantity: 2, unit: '' }]);
    edits = removeRow(edits, WEEK, { key: 'extra:x', kind: 'extra' });
    expect(edits[WEEK].extras).toEqual([]);
  });
});

describe('resetRow / restoreRemoved', () => {
  it('puts a changed item back to the plan', () => {
    let edits = editRow(none, WEEK, { key: itemKey(rice), kind: 'planned' }, { name: 'x', quantity: 1, unit: '' });
    edits = resetRow(edits, WEEK, itemKey(rice));
    expect(applyEdits(planned, edits[WEEK])[0]).toMatchObject({ name: 'rice', edited: false });
  });

  it('brings back removed items but keeps edits', () => {
    let edits = removeRow(none, WEEK, { key: itemKey(tofu), kind: 'planned' });
    edits = editRow(edits, WEEK, { key: itemKey(rice), kind: 'planned' }, { name: 'rice', quantity: 1, unit: 'g' });
    edits = restoreRemoved(edits, WEEK);
    expect(applyEdits(planned, edits[WEEK]).map((r) => r.name)).toEqual(['rice', 'tofu']);
    expect(applyEdits(planned, edits[WEEK])[0].edited).toBe(true);
  });
});

describe('setChecked', () => {
  it('ticks and unticks, and removing a row clears its tick', () => {
    let edits = setChecked(none, WEEK, 'a', true);
    expect(edits[WEEK].checked).toEqual({ a: true });
    edits = removeRow(edits, WEEK, { key: 'a', kind: 'planned' });
    expect(edits[WEEK].checked).toEqual({});
    expect(setChecked(setChecked(none, WEEK, 'b', true), WEEK, 'b', false)[WEEK].checked).toEqual({});
  });

  it('keeps ticks separate per week', () => {
    const edits = setChecked(none, WEEK, 'a', true);
    expect(edits['2026-10-19']).toBeUndefined();
  });
});

describe('pruneWeeks', () => {
  it('drops weeks before the cut-off', () => {
    const edits = setChecked(setChecked(none, '2026-08-03', 'a', true), '2026-10-12', 'a', true);
    expect(Object.keys(pruneWeeks(edits, '2026-09-07'))).toEqual(['2026-10-12']);
  });
});
