/** Id of a meal slot, e.g. 'lunch'. Slots are configurable, see MealSlot. */
export type MealType = string;

export interface MealSlot {
  id: MealType;
  label: string;
}

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
  notes?: string;
  /** http(s) link to where the recipe came from. */
  sourceUrl?: string;
  tags?: string[];
  /** file:// uri of a photo copied into app storage. */
  photo?: string;
}

export interface Settings {
  /** How many people you cook for. Shopping quantities scale to this. */
  household: number;
  /** Show the shopping list split into supermarket aisles. */
  groupByAisle: boolean;
  /** The meals planned each day, in order. */
  mealSlots: MealSlot[];
}

/** Maps a meal slot to a recipe id. */
export type DayPlan = Partial<Record<MealType, string>>;

/** Keyed by date string, YYYY-MM-DD. */
export type MealPlan = Record<string, DayPlan>;
