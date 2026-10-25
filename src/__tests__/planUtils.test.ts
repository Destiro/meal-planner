import { copyWeek, weekHasMeals } from '../planUtils';
import { MealPlan } from '../types';

const lastWeek = new Date(2026, 9, 5);
const thisWeek = new Date(2026, 9, 12);

describe('copyWeek', () => {
  it('copies each day to the same weekday of the target week', () => {
    const plan: MealPlan = { '2026-10-05': { lunch: 'a' }, '2026-10-11': { dinner: 'b', breakfast: 'c' } };
    const next = copyWeek(plan, lastWeek, thisWeek);
    expect(next['2026-10-12']).toEqual({ lunch: 'a' });
    expect(next['2026-10-18']).toEqual({ dinner: 'b', breakfast: 'c' });
  });

  it('replaces meals already in the target week, including days the source leaves empty', () => {
    const plan: MealPlan = { '2026-10-05': { lunch: 'a' }, '2026-10-12': { lunch: 'x' }, '2026-10-13': { lunch: 'y' } };
    const next = copyWeek(plan, lastWeek, thisWeek);
    expect(next['2026-10-12']).toEqual({ lunch: 'a' });
    expect(next['2026-10-13']).toBeUndefined();
  });

  it('does not touch other weeks or mutate the input', () => {
    const plan: MealPlan = { '2026-10-05': { lunch: 'a' }, '2026-10-20': { lunch: 'z' } };
    const copy = JSON.stringify(plan);
    const next = copyWeek(plan, lastWeek, thisWeek);
    expect(next['2026-10-20']).toEqual({ lunch: 'z' });
    expect(JSON.stringify(plan)).toBe(copy);
  });
});

describe('weekHasMeals', () => {
  it('ignores empty day entries', () => {
    expect(weekHasMeals({ '2026-10-12': {} }, thisWeek)).toBe(false);
    expect(weekHasMeals({ '2026-10-14': { lunch: 'a' } }, thisWeek)).toBe(true);
    expect(weekHasMeals({ '2026-10-20': { lunch: 'a' } }, thisWeek)).toBe(false);
  });
});
