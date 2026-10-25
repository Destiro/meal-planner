import { addDays, toKey } from './dates';
import { MealPlan } from './types';

/** True if any meal is planned in the 7 days starting at `weekStart`. */
export function weekHasMeals(plan: MealPlan, weekStart: Date): boolean {
  return Array.from({ length: 7 }, (_, i) => plan[toKey(addDays(weekStart, i))]).some(
    (day) => day && Object.keys(day).length > 0,
  );
}

/**
 * Returns a plan where the week starting `to` holds the same meals as the week starting `from`.
 * Meals already planned in the target week are replaced; other weeks are untouched.
 */
export function copyWeek(plan: MealPlan, from: Date, to: Date): MealPlan {
  const next: MealPlan = { ...plan };
  for (let i = 0; i < 7; i++) {
    const source = plan[toKey(addDays(from, i))];
    const targetKey = toKey(addDays(to, i));
    if (source && Object.keys(source).length > 0) next[targetKey] = { ...source };
    else delete next[targetKey];
  }
  return next;
}
