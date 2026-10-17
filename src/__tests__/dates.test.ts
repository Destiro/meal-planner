import { addDays, addMonths, monthGrid, startOfMonth, startOfWeek, toKey, weekDays } from '../dates';

describe('toKey', () => {
  it('formats dates as YYYY-MM-DD with zero padding', () => {
    expect(toKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toKey(new Date(2026, 9, 18))).toBe('2026-10-18');
  });
});

describe('startOfWeek', () => {
  it('returns the Monday of the week', () => {
    // Sunday 18 Oct 2026 belongs to the week starting Monday 12 Oct
    expect(toKey(startOfWeek(new Date(2026, 9, 18)))).toBe('2026-10-12');
    expect(toKey(startOfWeek(new Date(2026, 9, 12)))).toBe('2026-10-12');
    expect(toKey(startOfWeek(new Date(2026, 9, 14)))).toBe('2026-10-12');
  });
});

describe('addDays / weekDays', () => {
  it('crosses month and year boundaries', () => {
    expect(toKey(addDays(new Date(2026, 11, 30), 3))).toBe('2027-01-02');
    expect(toKey(addDays(new Date(2026, 2, 2), -3))).toBe('2026-02-27');
  });

  it('returns seven consecutive days', () => {
    const days = weekDays(new Date(2026, 9, 12)).map(toKey);
    expect(days).toHaveLength(7);
    expect(days[0]).toBe('2026-10-12');
    expect(days[6]).toBe('2026-10-18');
  });
});

describe('addMonths / startOfMonth', () => {
  it('moves between months without overflowing short months', () => {
    expect(toKey(addMonths(new Date(2026, 0, 31), 1))).toBe('2026-02-01');
    expect(toKey(addMonths(new Date(2026, 0, 15), -1))).toBe('2025-12-01');
    expect(toKey(startOfMonth(new Date(2026, 9, 18)))).toBe('2026-10-01');
  });
});

describe('monthGrid', () => {
  it('always draws whole Monday-first weeks covering the month', () => {
    for (let m = 0; m < 12; m++) {
      const grid = monthGrid(new Date(2026, m, 1));
      expect(grid.length % 7).toBe(0);
      expect(grid[0].getDay()).toBe(1); // Monday
      expect(grid[0] <= new Date(2026, m, 1)).toBe(true);
      expect(grid[grid.length - 1] >= new Date(2026, m + 1, 0)).toBe(true);
    }
  });

  it('sizes the grid to the number of weeks the month touches', () => {
    expect(monthGrid(new Date(2026, 9, 1))).toHaveLength(35); // Oct 2026: 5 rows
    expect(monthGrid(new Date(2026, 2, 1))).toHaveLength(42); // Mar 2026 starts on a Sunday: 6 rows
    expect(monthGrid(new Date(2027, 1, 1))).toHaveLength(28); // Feb 2027 starts on a Monday: 4 rows
  });
});
