import { DATA_VERSION, migrate } from '../migrate';
import { DEFAULT_SLOTS } from '../slots';

describe('migrate', () => {
  it('upgrades v1 data, parsing string ingredients and adding defaults', () => {
    const v1 = {
      recipes: [{ id: 'r', name: 'Oats', ingredients: ['200g oats', 'milk'] }],
      plan: { '2026-10-12': { lunch: 'r' } },
    };
    expect(migrate(v1)).toEqual({
      version: DATA_VERSION,
      recipes: [
        { id: 'r', name: 'Oats', servings: 2, ingredients: [{ name: 'oats', quantity: 200, unit: 'g' }, { name: 'milk' }] },
      ],
      plan: { '2026-10-12': { lunch: 'r' } },
      settings: { household: 2, groupByAisle: true, mealSlots: DEFAULT_SLOTS },
      shoppingEdits: {},
      pantry: [],
    });
  });

  it('upgrades v2 data by adding empty shopping edits', () => {
    const v2 = { version: 2, recipes: [], plan: {}, settings: { household: 3, groupByAisle: true, mealSlots: DEFAULT_SLOTS } };
    const result = migrate(v2);
    expect(result.shoppingEdits).toEqual({});
    expect(result.settings.household).toBe(3);
  });

  it('leaves current data alone', () => {
    const current = {
      version: DATA_VERSION,
      recipes: [{ id: 'r', name: 'X', servings: 4, ingredients: [{ name: 'egg', quantity: 2 }] }],
      plan: {},
      settings: { household: 3, groupByAisle: false, mealSlots: [{ id: 'snack-1', label: 'Snack' }] },
      pantry: [{ id: 'p1', name: 'rice', quantity: 500, unit: 'g' }, { id: 'p2', name: 'salt', unit: '' }],
      shoppingEdits: { '2026-10-12': { extras: [], overrides: { 'rice|g': null }, checked: { 'tofu|': true } } },
    };
    expect(migrate(current)).toEqual(current);
  });

  it('upgrades v3 data by adding an empty pantry, and drops unusable pantry entries', () => {
    expect(migrate({ version: 3, recipes: [], plan: {} }).pantry).toEqual([]);
    const messy = { pantry: [{ id: 'a', name: 'rice', unit: 'g' }, { name: 'no id' }, null, 'x'] };
    expect(migrate(messy).pantry).toEqual([{ id: 'a', name: 'rice', unit: 'g' }]);
  });

  it('falls back to the default meal slots when the saved ones are unusable', () => {
    expect(migrate({ settings: { mealSlots: [] } }).settings.mealSlots).toEqual(DEFAULT_SLOTS);
    expect(migrate({ settings: { mealSlots: 'x' } }).settings.mealSlots).toEqual(DEFAULT_SLOTS);
  });

  it('rejects data it cannot understand rather than guessing', () => {
    expect(() => migrate(null)).toThrow();
    expect(() => migrate('nope')).toThrow();
    expect(() => migrate({ version: DATA_VERSION + 1 })).toThrow();
  });
});

describe('freezing of hand-changed amounts (fixed in v5)', () => {
  const week = (overrides: object) => ({ extras: [], checked: { x: true }, overrides });
  const old = (shoppingEdits: object, version = 4) => ({ version, recipes: [], plan: {}, shoppingEdits });

  it('makes old hand changes follow the recipes again, keeping names and other details', () => {
    const result = migrate(
      old({
        '2026-10-26': week({
          'broccoli|': { name: 'broccoli', quantity: 2, unit: '' },
          'rice|g': { name: 'brown rice', quantity: 500, unit: 'g' },
          'milk|': null,
        }),
      }),
    );
    expect(result.shoppingEdits['2026-10-26']).toEqual({
      extras: [],
      checked: { x: true },
      overrides: {
        'broccoli|': { name: 'broccoli', quantity: 2, unit: '', base: 2 },
        'rice|g': { name: 'brown rice', quantity: 500, unit: 'g', base: 500 },
        'milk|': null,
      },
    });
  });

  it('leaves changes that already follow the recipes, and current data, alone', () => {
    const current = { 'broccoli|': { name: 'broccoli', quantity: 7, unit: '', base: 8 } };
    expect(migrate(old({ '2026-10-26': week(current) }, 5)).shoppingEdits['2026-10-26'].overrides).toEqual(current);
    expect(migrate(old({ '2026-10-26': week(current) }, 4)).shoppingEdits['2026-10-26'].overrides).toEqual(current);
  });

  it('copes with malformed edits', () => {
    expect(migrate(old({ '2026-10-26': 'junk', '2026-11-02': { overrides: null } })).shoppingEdits).toEqual({
      '2026-10-26': 'junk',
      '2026-11-02': { overrides: null },
    });
    expect(migrate(old([])).shoppingEdits).toEqual({});
  });
});
