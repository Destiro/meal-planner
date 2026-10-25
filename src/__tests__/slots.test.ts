import { addSlot, DEFAULT_SLOTS, isValidSlots, moveSlot, removeSlot, renameSlot } from '../slots';

const ids = DEFAULT_SLOTS.map((s) => s.id);

describe('addSlot', () => {
  it('adds a trimmed slot at the end', () => {
    const next = addSlot(DEFAULT_SLOTS, '  Snack ', () => 'snack-1');
    expect(next.at(-1)).toEqual({ id: 'snack-1', label: 'Snack' });
    expect(next).toHaveLength(4);
  });

  it('ignores blank and duplicate names, whatever the case', () => {
    expect(addSlot(DEFAULT_SLOTS, '   ')).toBe(DEFAULT_SLOTS);
    expect(addSlot(DEFAULT_SLOTS, 'lunch')).toBe(DEFAULT_SLOTS);
  });

  it('gives generated ids that are unique and safe', () => {
    const a = addSlot(DEFAULT_SLOTS, 'Late night!').at(-1)!;
    expect(a.id).toMatch(/^late-night-[a-z0-9]+$/);
  });
});

describe('renameSlot', () => {
  it('keeps the id so planned meals stay attached', () => {
    const next = renameSlot(DEFAULT_SLOTS, 'lunch', 'Brunch');
    expect(next.map((s) => s.id)).toEqual(ids);
    expect(next[1].label).toBe('Brunch');
  });

  it('ignores blank names and names other slots use', () => {
    expect(renameSlot(DEFAULT_SLOTS, 'lunch', ' ')).toBe(DEFAULT_SLOTS);
    expect(renameSlot(DEFAULT_SLOTS, 'lunch', 'dinner')).toBe(DEFAULT_SLOTS);
  });
});

describe('removeSlot', () => {
  it('removes a slot but never the last one', () => {
    expect(removeSlot(DEFAULT_SLOTS, 'lunch').map((s) => s.id)).toEqual(['breakfast', 'dinner']);
    const one = [DEFAULT_SLOTS[0]];
    expect(removeSlot(one, 'breakfast')).toBe(one);
  });
});

describe('moveSlot', () => {
  it('swaps with its neighbour and stops at the ends', () => {
    expect(moveSlot(DEFAULT_SLOTS, 'dinner', -1).map((s) => s.id)).toEqual(['breakfast', 'dinner', 'lunch']);
    expect(moveSlot(DEFAULT_SLOTS, 'breakfast', -1)).toBe(DEFAULT_SLOTS);
    expect(moveSlot(DEFAULT_SLOTS, 'dinner', 1)).toBe(DEFAULT_SLOTS);
  });
});

describe('isValidSlots', () => {
  it('accepts a proper list and rejects anything else', () => {
    expect(isValidSlots(DEFAULT_SLOTS)).toBe(true);
    expect(isValidSlots([])).toBe(false);
    expect(isValidSlots([{ id: 'x' }])).toBe(false);
    expect(isValidSlots([{ id: 'x', label: ' ' }])).toBe(false);
    expect(isValidSlots('nope')).toBe(false);
  });
});
