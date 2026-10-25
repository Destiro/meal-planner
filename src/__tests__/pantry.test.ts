import { addToPantry, applyPantry, pantryEntryFromText, pantryToText, sortPantry } from '../pantry';
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
