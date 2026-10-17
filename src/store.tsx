import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { MealPlan, MealType, Recipe } from './types';

const STORAGE_KEY = 'mealplanner:v1';

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const SEED_RECIPES: Recipe[] = [
  { id: 'seed-1', name: 'Overnight oats', ingredients: ['rolled oats', 'milk', 'chia seeds', 'blueberries'] },
  { id: 'seed-2', name: 'Chicken salad wrap', ingredients: ['chicken breast', 'tortilla wraps', 'lettuce', 'tomato'] },
  { id: 'seed-3', name: 'Veggie stir fry', ingredients: ['rice', 'broccoli', 'capsicum', 'soy sauce', 'tofu'] },
];

interface StoreValue {
  ready: boolean;
  recipes: Recipe[];
  plan: MealPlan;
  addRecipe: (name: string, ingredients: string[]) => void;
  deleteRecipe: (id: string) => void;
  setMeal: (dateKey: string, meal: MealType, recipeId: string | null) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [plan, setPlan] = useState<MealPlan>({});

  // Load once on startup.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const data = JSON.parse(raw);
          setRecipes(data.recipes ?? []);
          setPlan(data.plan ?? {});
        } else {
          setRecipes(SEED_RECIPES);
        }
      } catch (e) {
        console.warn('Could not load saved data', e);
        setRecipes(SEED_RECIPES);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  // Save whenever data changes (after the initial load).
  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ recipes, plan })).catch((e) =>
      console.warn('Could not save data', e),
    );
  }, [ready, recipes, plan]);

  const addRecipe = useCallback((name: string, ingredients: string[]) => {
    setRecipes((prev) => [...prev, { id: uid(), name, ingredients }]);
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

  const value = useMemo(
    () => ({ ready, recipes, plan, addRecipe, deleteRecipe, setMeal }),
    [ready, recipes, plan, addRecipe, deleteRecipe, setMeal],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
