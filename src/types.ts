export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner'] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export interface Ingredient {
  name: string;
  /** Amount as written in the recipe. Left out for things like "salt". */
  quantity?: number;
  /** Canonical unit (see ingredients.ts). Left out for plain counts like "2 eggs". */
  unit?: string;
}

export interface Recipe {
  id: string;
  name: string;
  /** How many people the quantities feed. */
  servings: number;
  ingredients: Ingredient[];
}

export interface Settings {
  /** How many people you cook for. Shopping quantities scale to this. */
  household: number;
}

/** Maps a meal slot to a recipe id. */
export type DayPlan = Partial<Record<MealType, string>>;

/** Keyed by date string, YYYY-MM-DD. */
export type MealPlan = Record<string, DayPlan>;
