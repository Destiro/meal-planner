import { canDecrease, formatQuantityLabel, nextQuantity, quantityStep } from '../quantity';

describe('quantityStep', () => {
  it('moves counts by one and weights by amounts that suit their size', () => {
    expect(quantityStep('', 3)).toBe(1);
    expect(quantityStep('tbsp', 2)).toBe(1);
    expect(quantityStep('cup', 2)).toBe(0.5);
    expect(quantityStep('g', 200)).toBe(50);
    expect(quantityStep('g', 700)).toBe(100);
    expect(quantityStep('g', 2000)).toBe(250);
  });
});

describe('nextQuantity', () => {
  it('adds and subtracts a step', () => {
    expect(nextQuantity(3, '', 1)).toBe(4);
    expect(nextQuantity(3, '', -1)).toBe(2);
    expect(nextQuantity(700, 'g', 1)).toBe(800);
    expect(nextQuantity(700, 'g', -1)).toBe(600);
    expect(nextQuantity(1.5, 'cup', 1)).toBe(2);
  });

  it('never goes below the smallest step for the unit', () => {
    expect(nextQuantity(1, '', -1)).toBe(1);
    expect(nextQuantity(50, 'g', -1)).toBe(50);
    expect(nextQuantity(0.5, 'cup', -1)).toBe(0.5);
  });

  it('steps down by the smaller step when crossing a size boundary, so it never skips past it', () => {
    expect(nextQuantity(300, 'g', -1)).toBe(250);
    expect(nextQuantity(1000, 'g', -1)).toBe(900);
    expect(nextQuantity(250, 'g', -1)).toBe(200);
  });

  it('copes with awkward amounts, such as ones scaled for a bigger household', () => {
    expect(nextQuantity(233.33, 'g', 1)).toBe(283.33);
    expect(nextQuantity(2.5, '', -1)).toBe(1.5);
  });
});

describe('canDecrease', () => {
  it('is false at the smallest amount', () => {
    expect(canDecrease(1, '')).toBe(false);
    expect(canDecrease(50, 'g')).toBe(false);
    expect(canDecrease(2, '')).toBe(true);
    expect(canDecrease(100, 'g')).toBe(true);
  });
});

describe('formatQuantityLabel', () => {
  it('shows a bare number for counts, including one, and units otherwise', () => {
    expect(formatQuantityLabel(1, '')).toBe('1');
    expect(formatQuantityLabel(3, '')).toBe('3');
    expect(formatQuantityLabel(700, 'g')).toBe('700 g');
    expect(formatQuantityLabel(1500, 'g')).toBe('1.5 kg');
  });
});
