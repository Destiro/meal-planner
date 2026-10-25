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
  /** Marked as a favourite, so it can be filtered for and shown first. */
  favourite?: boolean;
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

/** One line of a shopping list. Amounts use base units (g, ml) like ShoppingItem. */
export interface ListEntry {
  name: string;
  quantity: number;
  /** '' for plain counts. */
  unit: string;
}

/**
 * Your change to a line that comes from recipes. `base` is how much the recipes needed when you made it, so the
 * change can follow them: reducing 8 broccoli to 7 is remembered as "one fewer than the recipes need". Saved
 * changes from before this existed have no `base` and keep their amount as it is.
 */
export interface Override extends ListEntry {
  base?: number;
}

/** Hand edits to one week's shopping list. */
export interface WeekList {
  /** Items added by hand. */
  extras: (ListEntry & { id: string })[];
  /** Changes to planned items, keyed by their generated key. null means removed. */
  overrides: Record<string, Override | null>;
  /** Ticked rows, keyed by row key. */
  checked: Record<string, boolean>;
}

/** Keyed by the Monday of the week, YYYY-MM-DD. */
export type ShoppingEdits = Record<string, WeekList>;

/** Something you already have at home. */
export interface PantryItem {
  id: string;
  name: string;
  /** Amount in base units (g, ml). Left out for staples you always have, like salt. */
  quantity?: number;
  /** Empty string for plain counts. */
  unit: string;
}
