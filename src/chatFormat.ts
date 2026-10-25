import { addDays, toKey } from './dates';
import { parseIngredient } from './ingredients';
import { DEFAULT_SERVINGS } from './migrate';
import { RecipeInput } from './store';
import { MealSlot, Recipe } from './types';

export interface PlanEntry {
  day: string;
  meal: string;
  recipe: string;
}

/** A piece of an assistant reply: plain text, a recipe to save, or a meal plan to apply. */
export type Segment =
  | { kind: 'text'; text: string }
  | { kind: 'recipe'; recipe: RecipeInput }
  | { kind: 'plan'; entries: PlanEntry[] };

/** Drops the markdown the model sometimes adds even though we ask for plain text. */
const plain = (line: string) =>
  line
    .replace(/\*\*|__|`/g, '')
    .replace(/^\s*#+\s*/, '')
    .trim();

const stripBullet = (line: string) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '').trim();

const HEADERS = /^(ingredients?|method|steps?|instructions?|directions?)\s*:?\s*$/i;

/** Reads the text between [[RECIPE]] markers. Returns null if it doesn't look like a recipe. */
export function parseRecipeBlock(block: string): RecipeInput | null {
  let title = '';
  let servings = DEFAULT_SERVINGS;
  const ingredientLines: string[] = [];
  const steps: string[] = [];
  let section: 'none' | 'ingredients' | 'method' = 'none';

  for (const rawLine of block.split('\n')) {
    const line = plain(rawLine);
    if (!line) continue;

    const field = line.match(/^(title|name|serves|servings)\s*:\s*(.*)$/i);
    if (field) {
      if (/^(title|name)$/i.test(field[1])) title = field[2].trim();
      else servings = Math.max(1, Math.round(Number(field[2].match(/\d+/)?.[0])) || DEFAULT_SERVINGS);
      section = 'none';
      continue;
    }
    // "Time: 30 minutes" and similar lines are ignored.
    if (/^(time|prep|cook|total)[a-z ]*:/i.test(line)) continue;

    const header = line.match(HEADERS);
    if (header) {
      section = /^ingredient/i.test(header[1]) ? 'ingredients' : 'method';
      continue;
    }
    // "Ingredients: 200 g rice" on one line is unusual but cheap to accept.
    const inline = line.match(/^(ingredients?|method|steps?|instructions?)\s*:\s*(.+)$/i);
    if (inline) {
      section = /^ingredient/i.test(inline[1]) ? 'ingredients' : 'method';
      (section === 'ingredients' ? ingredientLines : steps).push(stripBullet(inline[2]));
      continue;
    }

    if (section === 'ingredients') ingredientLines.push(stripBullet(line));
    else if (section === 'method') steps.push(stripBullet(line));
  }

  if (!title || (ingredientLines.length === 0 && steps.length === 0)) return null;
  return {
    name: title,
    servings,
    ingredients: ingredientLines.filter(Boolean).map(parseIngredient),
    notes: steps.length ? steps.map((step, i) => `${i + 1}. ${step}`).join('\n') : undefined,
  };
}

/** Reads the "Day | Meal | Recipe" lines between [[PLAN]] markers. */
export function parsePlanBlock(block: string): PlanEntry[] {
  return block.split('\n').flatMap((rawLine): PlanEntry[] => {
    const parts = stripBullet(plain(rawLine)).split('|').map((p) => p.trim());
    return parts.length === 3 && parts.every(Boolean) ? [{ day: parts[0], meal: parts[1], recipe: parts[2] }] : [];
  });
}

const BLOCK = /\[\[(RECIPE|PLAN)\]\]([\s\S]*?)(?:\[\[\/\1\]\]|$)/gi;

/**
 * Splits a reply into text, recipes and plans. A block that can't be read is kept as plain text so
 * nothing the assistant said is lost. A block with no closing marker runs to the end of the reply.
 */
export function parseReply(reply: string): Segment[] {
  const segments: Segment[] = [];
  const pushText = (raw: string) => {
    const text = raw
      .split('\n')
      .map(plain)
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    if (text) segments.push({ kind: 'text', text });
  };

  let last = 0;
  for (const match of reply.matchAll(BLOCK)) {
    pushText(reply.slice(last, match.index));
    last = match.index + match[0].length;

    if (match[1].toUpperCase() === 'RECIPE') {
      const recipe = parseRecipeBlock(match[2]);
      if (recipe) segments.push({ kind: 'recipe', recipe });
      else pushText(match[2]);
    } else {
      const entries = parsePlanBlock(match[2]);
      if (entries.length) segments.push({ kind: 'plan', entries });
      else pushText(match[2]);
    }
  }
  pushText(reply.slice(last));
  return segments;
}

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const normalise = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export interface PlannedMeal {
  dateKey: string;
  slotId: string;
  recipeId: string;
  recipeName: string;
}

/**
 * Matches a suggested plan to the week starting `weekStart` (a Monday). Entries that name a recipe you
 * don't have, a day we can't read or a meal you don't plan are returned in `skipped`.
 */
export function planToMeals(
  entries: PlanEntry[],
  recipes: Recipe[],
  slots: MealSlot[],
  weekStart: Date,
): { meals: PlannedMeal[]; skipped: PlanEntry[] } {
  const meals: PlannedMeal[] = [];
  const skipped: PlanEntry[] = [];
  for (const entry of entries) {
    const dayIndex = DAYS.indexOf(entry.day.trim().toLowerCase().slice(0, 3));
    const slot = slots.find((s) => normalise(s.label) === normalise(entry.meal) || s.id === entry.meal.toLowerCase());
    const recipe = recipes.find((r) => normalise(r.name) === normalise(entry.recipe));
    if (dayIndex < 0 || !slot || !recipe) {
      skipped.push(entry);
      continue;
    }
    meals.push({ dateKey: toKey(addDays(weekStart, dayIndex)), slotId: slot.id, recipeId: recipe.id, recipeName: recipe.name });
  }
  return { meals, skipped };
}
