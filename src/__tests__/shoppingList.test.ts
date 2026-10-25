import { editRow } from '../shoppingEdits';
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

describe('issue 18: a hand-reduced amount keeps following the recipes', () => {
  const stirFry: Recipe = {
    id: 'sf',
    name: 'Veggie stir fry',
    servings: 2,
    ingredients: [{ name: 'broccoli', quantity: 2 }, { name: 'rice', quantity: 100, unit: 'g' }],
  };
  // Four stir-fries in the week of Monday 26 October 2026.
  const fourMeals: MealPlan = {
    '2026-10-26': { dinner: 'sf' },
    '2026-10-27': { dinner: 'sf' },
    '2026-10-28': { dinner: 'sf' },
    '2026-10-29': { dinner: 'sf' },
  };
  const inputs = (household: number, edits: ShoppingEdits) => ({
    recipes: [stirFry],
    plan: fourMeals,
    settings: { ...DEFAULT_SETTINGS, household },
    pantry: [] as PantryItem[],
    edits,
  });
  const broccoli = (household: number, edits: ShoppingEdits) =>
    shoppingRows(inputs(household, edits), WEEK, monday).rows.find((r) => r.name === 'broccoli');

  // The person reduces the 8 broccoli to 7 on the list, through the - button or the edit dialog.
  const reduced = () => {
    const row = broccoli(2, {})!;
    expect(row.quantity).toBe(8);
    return editRow({}, WEEK, row, { name: row.name, quantity: 7, unit: row.unit });
  };

  it('shows 7 straight after the change, then follows when Cooking for goes up', () => {
    const edits = reduced();
    expect(broccoli(2, edits)).toMatchObject({ quantity: 7, edited: true });
    expect(broccoli(3, edits)?.quantity).toBe(11); // 12 needed, minus the one you took off
    expect(broccoli(4, edits)?.quantity).toBe(15); // 16 needed, minus one
  });

  it('follows when Cooking for goes down, and when a meal is added or removed', () => {
    const edits = reduced();
    expect(broccoli(1, edits)?.quantity).toBe(3); // 4 needed, minus one
    const threeMeals = { ...inputs(2, edits), plan: { ...fourMeals, '2026-10-29': {} } };
    expect(shoppingRows(threeMeals, WEEK, monday).rows.find((r) => r.name === 'broccoli')?.quantity).toBe(5); // 6 - 1
  });

  it('drops the line once the adjustment covers everything the recipes need', () => {
    const edits = reduced();
    const oneMeal = { ...inputs(2, edits), plan: { '2026-10-26': { dinner: 'sf' } } };
    // One meal needs 2 broccoli; 2 - 1 = 1 is still on the list.
    expect(shoppingRows(oneMeal, WEEK, monday).rows.find((r) => r.name === 'broccoli')?.quantity).toBe(1);
    const row = shoppingRows(oneMeal, WEEK, monday).rows.find((r) => r.name === 'broccoli')!;
    const tooMuch = editRow(edits, WEEK, row, { name: 'broccoli', quantity: 0.5, unit: '' });
    const one = { ...oneMeal, edits: tooMuch };
    expect(shoppingRows(one, WEEK, monday).rows.find((r) => r.name === 'broccoli')?.quantity).toBe(0.5);
    const lower = { ...one, settings: { ...DEFAULT_SETTINGS, household: 1 } }; // now 1 needed, adjustment is -1.5
    expect(shoppingRows(lower, WEEK, monday).rows.find((r) => r.name === 'broccoli')).toBeUndefined();
  });

  it('leaves other lines on the list alone', () => {
    const rows = shoppingRows(inputs(3, reduced()), WEEK, monday).rows;
    expect(rows.find((r) => r.name === 'rice')).toMatchObject({ quantity: 600, edited: false });
  });

  it('keeps following after you adjust it again', () => {
    const first = reduced();
    const row = broccoli(3, first)!; // shows 11, recipes need 12
    const again = editRow(first, WEEK, row, { name: 'broccoli', quantity: 9, unit: '' }); // three fewer than needed
    expect(broccoli(3, again)?.quantity).toBe(9);
    expect(broccoli(2, again)?.quantity).toBe(5); // 8 needed, minus the three you took off
  });

  it('a name change alone no longer freezes the amount', () => {
    const row = broccoli(2, {})!;
    const renamed = editRow({}, WEEK, row, { name: 'tenderstem broccoli', quantity: row.quantity, unit: row.unit });
    expect(shoppingRows(inputs(3, renamed), WEEK, monday).rows.find((r) => r.name === 'tenderstem broccoli')?.quantity).toBe(12);
  });

  it('keeps an amount that was saved before adjustments existed, and one where you changed the unit', () => {
    const legacy: ShoppingEdits = {
      [WEEK]: { extras: [], overrides: { 'broccoli|': { name: 'broccoli', quantity: 7, unit: '' } }, checked: {} },
    };
    expect(broccoli(3, legacy)?.quantity).toBe(7);

    const row = broccoli(2, {})!;
    const inBags = editRow({}, WEEK, row, { name: 'broccoli', quantity: 2, unit: 'bag' });
    // The unit no longer matches the recipes' count, so there is nothing to follow: the amount you set stays.
    const rows = shoppingRows(inputs(3, inBags), WEEK, monday).rows.filter((r) => r.name === 'broccoli');
    expect(rows.map((r) => [r.quantity, r.unit])).toEqual([[2, 'bag']]);
  });
});
