import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { parseIngredient } from './ingredients';
import { DEFAULT_SERVINGS, DEFAULT_SETTINGS, DATA_VERSION, migrate } from './migrate';
import { copyWeek } from './planUtils';
import { addDays, startOfWeek, toKey } from './dates';
import { pruneWeeks } from './shoppingEdits';
import { MealPlan, MealSlot, MealType, PantryItem, Recipe, Settings, ShoppingEdits } from './types';

// The key predates versioning, so it keeps its "v1" name; the version lives inside the data.
const STORAGE_KEY = 'mealplanner:v1';
const BACKUP_KEY = 'mealplanner:backup';

export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const uid = newId;

/** Hand edits to shopping lists are kept for the last few weeks, then dropped. */
const KEEP_EDIT_WEEKS = 5;

const seed = (id: string, name: string, ingredients: string[]): Recipe => ({
  id,
  name,
  servings: DEFAULT_SERVINGS,
  ingredients: ingredients.map(parseIngredient),
});

const SEED_RECIPES: Recipe[] = [
  seed('seed-1', 'Overnight oats', ['80g rolled oats', '250 ml milk', '1 tbsp chia seeds', '100g blueberries']),
  seed('seed-2', 'Chicken salad wrap', ['300g chicken breast', '2 tortilla wraps', 'lettuce', '2 tomatoes']),
  seed('seed-3', 'Veggie stir fry', ['200g rice', '1 broccoli', '1 capsicum', '2 tbsp soy sauce', '200g tofu']),
];

export type RecipeInput = Omit<Recipe, 'id'>;

interface StoreValue {
  ready: boolean;
  recipes: Recipe[];
  plan: MealPlan;
  settings: Settings;
  pantry: PantryItem[];
  /** Change the pantry, e.g. with addToPantry from pantry.ts. */
  updatePantry: (change: (pantry: PantryItem[]) => PantryItem[]) => void;
  shoppingEdits: ShoppingEdits;
  /** Change the hand edits using one of the reducers in shoppingEdits.ts. */
  updateShoppingEdits: (change: (edits: ShoppingEdits) => ShoppingEdits) => void;
  addRecipe: (recipe: RecipeInput) => void;
  updateRecipe: (id: string, recipe: RecipeInput) => void;
  deleteRecipe: (id: string) => void;
  setMeal: (dateKey: string, meal: MealType, recipeId: string | null) => void;
  copyWeekPlan: (from: Date, to: Date) => void;
  setHousehold: (people: number) => void;
  setGroupByAisle: (on: boolean) => void;
  setMealSlots: (slots: MealSlot[]) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [plan, setPlan] = useState<MealPlan>({});
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [shoppingEdits, setShoppingEdits] = useState<ShoppingEdits>({});
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  // Turned off if we couldn't read what's on the phone, so we never overwrite it with defaults.
  const canSave = useRef(true);

  // Load once on startup.
  useEffect(() => {
    (async () => {
      let raw: string | null = null;
      try {
        raw = await AsyncStorage.getItem(STORAGE_KEY);
      } catch (e) {
        console.warn('Could not read saved data', e);
        canSave.current = false;
      }

      if (raw) {
        try {
          const data = migrate(JSON.parse(raw));
          setRecipes(data.recipes);
          setPlan(data.plan);
          setSettings(data.settings);
          setPantry(data.pantry);
          setShoppingEdits(pruneWeeks(data.shoppingEdits, toKey(addDays(startOfWeek(new Date()), -7 * KEEP_EDIT_WEEKS))));
        } catch (e) {
          // Unreadable or from a newer app: keep a copy aside instead of losing it, then start fresh.
          console.warn('Saved data could not be understood', e);
          await AsyncStorage.setItem(BACKUP_KEY, raw).catch(() => {});
          setRecipes(SEED_RECIPES);
        }
      } else {
        setRecipes(SEED_RECIPES);
      }
      setReady(true);
    })();
  }, []);

  // Save whenever data changes (after the initial load).
  useEffect(() => {
    if (!ready || !canSave.current) return;
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: DATA_VERSION, recipes, plan, settings, shoppingEdits, pantry }),
    ).catch((e) => console.warn('Could not save data', e));
  }, [ready, recipes, plan, settings, shoppingEdits, pantry]);

  const updatePantry = useCallback((change: (pantry: PantryItem[]) => PantryItem[]) => {
    setPantry(change);
  }, []);

  const updateShoppingEdits = useCallback((change: (edits: ShoppingEdits) => ShoppingEdits) => {
    setShoppingEdits(change);
  }, []);

  const addRecipe = useCallback((recipe: RecipeInput) => {
    setRecipes((prev) => [...prev, { id: uid(), ...recipe }]);
  }, []);

  const updateRecipe = useCallback((id: string, recipe: RecipeInput) => {
    setRecipes((prev) => prev.map((r) => (r.id === id ? { id, ...recipe } : r)));
  }, []);

  const deleteRecipe = useCallback((id: string) => {
    setRecipes((prev) => prev.filter((r) => r.id !== id));
    // Remove any planned meals that used this recipe.
    setPlan((prev) => {
      const next: MealPlan = {};
      for (const [date, day] of Object.entries(prev)) {
        const kept = Object.fromEntries(Object.entries(day).filter(([, rid]) => rid !== id));
        if (Object.keys(kept).length) next[date] = kept;
      }
      return next;
    });
  }, []);

  const setMeal = useCallback((dateKey: string, meal: MealType, recipeId: string | null) => {
    setPlan((prev) => {
      const day = { ...(prev[dateKey] ?? {}) };
      if (recipeId) day[meal] = recipeId;
      else delete day[meal];
      return { ...prev, [dateKey]: day };
    });
  }, []);

  const copyWeekPlan = useCallback((from: Date, to: Date) => {
    setPlan((prev) => copyWeek(prev, from, to));
  }, []);

  const setHousehold = useCallback((people: number) => {
    setSettings((prev) => ({ ...prev, household: Math.min(20, Math.max(1, Math.round(people))) }));
  }, []);

  const setGroupByAisle = useCallback((on: boolean) => {
    setSettings((prev) => ({ ...prev, groupByAisle: on }));
  }, []);

  const setMealSlots = useCallback((mealSlots: MealSlot[]) => {
    setSettings((prev) => ({ ...prev, mealSlots }));
  }, []);

  const value = useMemo(
    () => ({ ready, recipes, plan, settings, shoppingEdits, updateShoppingEdits, pantry, updatePantry, addRecipe, updateRecipe, deleteRecipe, setMeal, copyWeekPlan, setHousehold, setGroupByAisle, setMealSlots }),
    [ready, recipes, plan, settings, shoppingEdits, updateShoppingEdits, pantry, updatePantry, addRecipe, updateRecipe, deleteRecipe, setMeal, copyWeekPlan, setHousehold, setGroupByAisle, setMealSlots],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
