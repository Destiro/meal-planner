import { shoppingRows } from '../shoppingList';
import { DEFAULT_SETTINGS } from '../migrate';
import { MealPlan, PantryItem, Recipe, ShoppingEdits } from '../types';

const recipes: Recipe[] = [
  {
    id: 'a',
    name: 'Stir fry',
    servings: 2,
    ingredients: [{ name: 'rice', quantity: 200, unit: 'g' }, { name: 'tofu' }],
  },
];
const plan: MealPlan = { '2026-10-26': { dinner: 'a' } };
const monday = new Date(2026, 9, 26);
const WEEK = '2026-10-26';
const base = { recipes, plan, settings: DEFAULT_SETTINGS, pantry: [] as PantryItem[], edits: {} as ShoppingEdits };

describe('shoppingRows', () => {
  it('lists what the planned meals need', () => {
    expect(shoppingRows(base, WEEK, monday).rows.map((r) => r.name)).toEqual(['rice', 'tofu']);
  });

  it('takes the pantry off first, then applies hand edits on top', () => {
    const pantry: PantryItem[] = [{ id: 'p', name: 'rice', quantity: 200, unit: 'g' }];
    const edits: ShoppingEdits = { [WEEK]: { extras: [{ id: 'x', name: 'sunblock', quantity: 1, unit: '' }], overrides: {}, checked: {} } };
    const result = shoppingRows({ ...base, pantry, edits }, WEEK, monday);
    expect(result.rows.map((r) => r.name)).toEqual(['sunblock', 'tofu']);
    expect(result.covered).toBe(1);
    expect(result.needed.map((i) => i.name)).toEqual(['tofu']);
  });

  it('ignores edits made for other weeks', () => {
    const edits: ShoppingEdits = { '2026-11-02': { extras: [{ id: 'x', name: 'sunblock', quantity: 1, unit: '' }], overrides: {}, checked: {} } };
    expect(shoppingRows({ ...base, edits }, WEEK, monday).rows.map((r) => r.name)).toEqual(['rice', 'tofu']);
  });
});
