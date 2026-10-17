export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner'] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export interface Recipe {
  id: string;
  name: string;
  ingredients: string[];
}

/** Maps a meal slot to a recipe id. */
export type DayPlan = Partial<Record<MealType, string>>;

/** Keyed by date string, YYYY-MM-DD. */
export type MealPlan = Record<string, DayPlan>;
