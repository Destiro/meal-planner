import { ExploreRecipe, parseExploreResponse } from './explore';

/** The Cloudflare Worker in worker/. The address isn't secret; the API key lives only on Cloudflare. */
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://meal-planner-api.connordebruyn234.workers.dev';

const TIMEOUT_MS = 20000;

/** An error whose message is fine to show to the person using the app. */
export class ApiError extends Error {}

async function getRecipes(path: string, params: Record<string, string | number>): Promise<ExploreRecipe[]> {
  const url = new URL(path, API_URL);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(url.toString(), { signal: controller.signal });
  } catch (e) {
    const timedOut = controller.signal.aborted;
    throw new ApiError(
      timedOut ? 'The recipe service took too long. Try again.' : "Can't reach the recipe service. Check your connection.",
      { cause: e },
    );
  } finally {
    clearTimeout(timer);
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // Handled below: an unreadable reply is treated like any other failure.
  }

  if (!response.ok) {
    const message = (body as { error?: unknown } | null)?.error;
    throw new ApiError(typeof message === 'string' ? message : 'The recipe service is unavailable right now.');
  }
  return parseExploreResponse(body);
}

/** Recipes matching `query`, each with its ingredients and steps. */
export const searchOnline = (query: string, number = 10) => getRecipes('/recipes/search', { q: query.trim(), number });

/** A few random recipes for inspiration. */
export const randomOnline = (number = 6) => getRecipes('/recipes/random', { number });
