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

describe('amount after the name', () => {
  it.each([
    ['flour 2 bags', { name: 'flour', quantity: 2, unit: 'bag' }],
    ['Flour 2 Bags', { name: 'Flour', quantity: 2, unit: 'bag' }],
    ['flour x2', { name: 'flour', quantity: 2 }],
    ['flour 2x', { name: 'flour', quantity: 2 }],
    ['flour ×2', { name: 'flour', quantity: 2 }],
    ['eggs x 6', { name: 'eggs', quantity: 6 }],
    ['eggs 12', { name: 'eggs', quantity: 12 }],
    ['flour, 2 bags', { name: 'flour', quantity: 2, unit: 'bag' }],
    ['flour (2 bags)', { name: 'flour', quantity: 2, unit: 'bag' }],
    ['flour - 2 bags', { name: 'flour', quantity: 2, unit: 'bag' }],
    ['pasta 500g', { name: 'pasta', quantity: 500, unit: 'g' }],
    ['milk 2 l', { name: 'milk', quantity: 2, unit: 'l' }],
    ['bin bags 2', { name: 'bin bags', quantity: 2 }],
    ['coke zero 330ml', { name: 'coke zero', quantity: 330, unit: 'ml' }],
    ['garlic, 3 cloves', { name: 'garlic', quantity: 3, unit: 'clove' }],
  ])('%s', (line, expected) => {
    expect(parseIngredient(line)).toEqual(expected);
  });

  it('leaves things that are not clearly an amount as plain names', () => {
    for (const line of ['vitamin b12', 'pasta 2 large', 'ranch 2000', 'salt to taste', 'butter, softened', '7up', 'flour 2 bags of']) {
      expect(parseIngredient(line)).toEqual({ name: line });
    }
  });

  it('prefers an amount at the start when both are there', () => {
    expect(parseIngredient('2 bags flour 3')).toEqual({ name: 'flour 3', quantity: 2, unit: 'bag' });
  });
});

describe('a times sign before the name', () => {
  it.each([
    ['2x flour', { name: 'flour', quantity: 2 }],
    ['2 x flour', { name: 'flour', quantity: 2 }],
    ['3 × eggs', { name: 'eggs', quantity: 3 }],
    ['2X bags of flour', { name: 'flour', quantity: 2, unit: 'bag' }],
    ['2x 3 flour', { name: '3 flour', quantity: 2 }],
  ])('%s', (line, expected) => {
    expect(parseIngredient(line)).toEqual(expected);
  });

  it('keeps names that start with a number stuck to a word', () => {
    expect(parseIngredient('7up')).toEqual({ name: '7up' });
    expect(parseIngredient('5 alive')).toEqual({ name: 'alive', quantity: 5 });
  });
});
