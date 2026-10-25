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
      shoppingEdits: { '2026-10-12': { extras: [], overrides: { 'rice|g': null }, checked: { 'tofu|': true } } },
    };
    expect(migrate(current)).toEqual(current);
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
