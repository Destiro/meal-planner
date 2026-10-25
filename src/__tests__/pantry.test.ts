import { addToPantry, applyPantry, applyPantryActions, pantryEntryFromText, pantryToText, sortPantry } from '../pantry';
import { ShoppingItem } from '../shopping';
import { PantryItem } from '../types';

const item = (name: string, quantity: number, unit = ''): ShoppingItem => ({ name, quantity, unit, aisle: 'Other' });
const have = (name: string, quantity: number | undefined, unit = '', id = name): PantryItem => ({
  id,
  name,
  quantity,
  unit,
});

describe('pantryEntryFromText / pantryToText', () => {
  it('reads amounts in base units, and no amount as a staple', () => {
    expect(pantryEntryFromText('2 kg rice')).toEqual({ name: 'rice', quantity: 2000, unit: 'g' });
    expect(pantryEntryFromText('6 eggs')).toEqual({ name: 'eggs', quantity: 6, unit: '' });
    expect(pantryEntryFromText('salt')).toEqual({ name: 'salt', unit: '' });
    expect(pantryEntryFromText(' ')).toBeNull();
  });

  it('round-trips through the text form', () => {
    for (const text of ['salt', '500 g rice', '6 eggs']) {
      expect(pantryToText(pantryEntryFromText(text)!)).toBe(text);
    }
  });
});

describe('addToPantry', () => {
  it('adds up the same thing in the same unit, ignoring plurals and case', () => {
    let pantry = addToPantry([], { name: 'tomato', quantity: 2, unit: '' }, 'a');
    pantry = addToPantry(pantry, { name: 'Tomatoes', quantity: 3, unit: '' }, 'b');
    expect(pantry).toEqual([{ id: 'a', name: 'tomato', quantity: 5, unit: '' }]);
  });

  it('keeps different units as separate items and does not duplicate staples', () => {
    let pantry = addToPantry([], { name: 'milk', quantity: 500, unit: 'ml' }, 'a');
    pantry = addToPantry(pantry, { name: 'milk', quantity: 1, unit: '' }, 'b');
    expect(pantry).toHaveLength(2);
    expect(addToPantry([have('salt', undefined)], { name: 'salt', unit: '' }, 'c')).toHaveLength(1);
  });
});

describe('applyPantry', () => {
  it('subtracts what you have and hides items that are fully covered', () => {
    const list = [item('rice', 700, 'g'), item('egg', 2), item('tofu', 1)];
    const result = applyPantry(list, [have('rice', 500, 'g'), have('egg', 6)]);
    expect(result.items).toEqual([item('rice', 200, 'g'), item('tofu', 1)]);
    expect(result.covered).toBe(1);
  });

  it('hides an item you have a staple of, whatever unit the list uses', () => {
    const result = applyPantry([item('salt', 5, 'g'), item('salt', 1)], [have('salt', undefined)]);
    expect(result).toEqual({ items: [], covered: 2 });
  });

  it('matches plural and singular names', () => {
    expect(applyPantry([item('tomatoes', 2)], [have('tomato', 2)]).items).toEqual([]);
  });

  it('ignores amounts in a different unit, since they cannot be compared', () => {
    const list = [item('milk', 500, 'ml')];
    expect(applyPantry(list, [have('milk', 2)]).items).toEqual(list);
  });

  it('adds up several pantry entries and leaves the input alone', () => {
    const list = [item('rice', 700, 'g')];
    const copy = JSON.stringify(list);
    expect(applyPantry(list, [have('rice', 300, 'g', 'a'), have('rice', 400, 'g', 'b')]).items).toEqual([]);
    expect(JSON.stringify(list)).toBe(copy);
  });
});

describe('sortPantry', () => {
  it('sorts by name without changing the original', () => {
    const pantry = [have('rice', 1, 'g'), have('apple', 1)];
    expect(sortPantry(pantry).map((p) => p.name)).toEqual(['apple', 'rice']);
    expect(pantry[0].name).toBe('rice');
  });
});

describe('applyPantryActions', () => {
  let n = 0;
  const makeId = () => `id${++n}`;

  it('adds items, merging amounts with what is already there', () => {
    const start = [have('rice', 500, 'g', 'r')];
    const result = applyPantryActions(start, [{ action: 'add', text: '250 g rice' }, { action: 'add', text: '6 eggs' }], makeId);
    expect(result.added).toBe(2);
    expect(result.pantry).toEqual([
      { id: 'r', name: 'rice', quantity: 750, unit: 'g' },
      { id: expect.any(String), name: 'eggs', quantity: 6, unit: '' },
    ]);
    expect(start[0].quantity).toBe(500);
  });

  it('removes whole items by name, treating plurals alike, and counts only real removals', () => {
    const result = applyPantryActions(
      [have('tomato', 2), have('milk', 500, 'ml')],
      [{ action: 'remove', text: 'Tomatoes' }, { action: 'remove', text: 'butter' }],
      makeId,
    );
    expect(result.pantry.map((p) => p.name)).toEqual(['milk']);
    expect(result).toMatchObject({ added: 0, removed: 1 });
  });

  it('ignores lines it cannot read', () => {
    expect(applyPantryActions([], [{ action: 'add', text: '   ' }], makeId)).toEqual({ pantry: [], added: 0, removed: 0, reduced: 0 });
  });
});

describe('applyPantryActions: using up an amount', () => {
  const makeId = () => 'x';

  it('lowers the amount ("I used 200 g of rice") and keeps the rest', () => {
    const result = applyPantryActions([have('rice', 500, 'g')], [{ action: 'remove', text: '200 g rice' }], makeId);
    expect(result.pantry).toEqual([have('rice', 300, 'g')]);
    expect(result).toMatchObject({ removed: 0, reduced: 1 });
  });

  it('takes the item out when it is all used up, or more than it', () => {
    for (const text of ['500 g rice', '1 kg rice']) {
      const result = applyPantryActions([have('rice', 500, 'g')], [{ action: 'remove', text }], makeId);
      expect(result.pantry).toEqual([]);
      expect(result).toMatchObject({ removed: 1, reduced: 0 });
    }
  });

  it('still removes the whole item when no amount is given', () => {
    const result = applyPantryActions([have('rice', 500, 'g')], [{ action: 'remove', text: 'rice' }], makeId);
    expect(result.pantry).toEqual([]);
  });

  it('leaves things alone when the amount cannot be compared or the item is a staple', () => {
    const start = [have('milk', 500, 'ml'), have('salt', undefined)];
    const result = applyPantryActions(start, [{ action: 'remove', text: '2 milk' }, { action: 'remove', text: '1 tsp salt' }], makeId);
    expect(result.pantry).toEqual(start);
    expect(result).toMatchObject({ removed: 0, reduced: 0 });
  });
});

describe('addToPantry: counts and containers', () => {
  it('adds a bare count to containers of the same thing, but not to a weight', () => {
    let pantry = addToPantry([], { name: 'flour', quantity: 2, unit: 'bag' }, 'a');
    pantry = addToPantry(pantry, { name: 'bags of flour', quantity: 1, unit: '' }, 'b');
    expect(pantry).toEqual([{ id: 'a', name: 'flour', quantity: 3, unit: 'bag' }]);

    const weighed = addToPantry([have('flour', 500, 'g')], { name: 'flour', quantity: 1, unit: 'bag' }, 'c');
    expect(weighed).toHaveLength(2);
  });
});
