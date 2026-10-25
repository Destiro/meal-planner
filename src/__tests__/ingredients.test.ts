import { formatAmount, formatIngredient, isCountLike, parseIngredient } from '../ingredients';

describe('parseIngredient', () => {
  it.each([
    ['200g rice', { name: 'rice', quantity: 200, unit: 'g' }],
    ['200 grams rice', { name: 'rice', quantity: 200, unit: 'g' }],
    ['1.5 cups of milk', { name: 'milk', quantity: 1.5, unit: 'cup' }],
    ['1 1/2 tbsp. olive oil', { name: 'olive oil', quantity: 1.5, unit: 'tbsp' }],
    ['1/2 tsp salt', { name: 'salt', quantity: 0.5, unit: 'tsp' }],
    ['2 eggs', { name: 'eggs', quantity: 2 }],
    ['3 large eggs', { name: 'large eggs', quantity: 3 }],
    ['rolled oats', { name: 'rolled oats' }],
    ['  salt  ', { name: 'salt' }],
  ])('%s', (line, expected) => {
    expect(parseIngredient(line)).toEqual(expected);
  });

  it('keeps a bare number as the name rather than losing the line', () => {
    expect(parseIngredient('200g')).toEqual({ name: '200g' });
    expect(parseIngredient('0 eggs')).toEqual({ name: '0 eggs' });
  });
});

describe('formatIngredient', () => {
  it('round-trips with parseIngredient', () => {
    for (const line of ['200 g rice', '2 eggs', '1.5 cups milk', '1 cup flour', 'salt']) {
      expect(formatIngredient(parseIngredient(line))).toBe(line);
    }
  });
});

describe('formatAmount', () => {
  it('rounds to two decimals', () => {
    expect(formatAmount(0.3333333, 'cup')).toBe('0.33 cups');
  });
});

describe('containers as units', () => {
  it.each([
    ['3 bags of flour', { name: 'flour', quantity: 3, unit: 'bag' }],
    ['1 bag flour', { name: 'flour', quantity: 1, unit: 'bag' }],
    ['a bag of flour', { name: 'flour', quantity: 1, unit: 'bag' }],
    ['bag of flour', { name: 'flour', quantity: 1, unit: 'bag' }],
    ['2 cans of chopped tomatoes', { name: 'chopped tomatoes', quantity: 2, unit: 'can' }],
    ['2 cloves garlic', { name: 'garlic', quantity: 2, unit: 'clove' }],
    ['2 loaves bread', { name: 'bread', quantity: 2, unit: 'loaf' }],
    ['1 bunch of parsley', { name: 'parsley', quantity: 1, unit: 'bunch' }],
    ['3 boxes of cereal', { name: 'cereal', quantity: 3, unit: 'box' }],
  ])('%s', (line, expected) => {
    expect(parseIngredient(line)).toEqual(expected);
  });

  it('does not mistake other "x of y" phrases for containers', () => {
    expect(parseIngredient('cup of tea')).toEqual({ name: 'cup of tea' });
    expect(parseIngredient('piece of cake')).toEqual({ name: 'piece of cake' });
  });

  it('shows the plural only when the amount is not one, and reads back what it writes', () => {
    expect(formatAmount(3, 'bag')).toBe('3 bags');
    expect(formatAmount(1, 'bag')).toBe('1 bag');
    expect(formatAmount(2, 'loaf')).toBe('2 loaves');
    expect(formatAmount(2, 'box')).toBe('2 boxes');
    for (const line of ['3 bags flour', '1 bag flour', '2 loaves bread', '2 cloves garlic']) {
      expect(formatIngredient(parseIngredient(line))).toBe(line);
    }
  });

  it('classes plain counts and containers as things that add together', () => {
    expect(isCountLike('')).toBe(true);
    expect(isCountLike('bag')).toBe(true);
    expect(isCountLike('g')).toBe(false);
    expect(isCountLike('cup')).toBe(false);
  });
});
