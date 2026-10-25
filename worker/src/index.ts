/**
 * A small proxy between the app and Spoonacular, so the API key never ships inside the app.
 *
 *   GET /recipes/search?q=pasta&number=10&offset=0   search, with ingredients and instructions
 *   GET /recipes/random?number=5                     random recipes for inspiration
 *   GET /health                                      "ok"
 *
 * Responses are { recipes: [...] } (search also has `total`), each recipe with plain fields plus
 * `ingredients` and `steps`. Errors are { error: "message" }.
 */

interface Env {
  /** Set with `npx wrangler secret put SPOONACULAR_API_KEY`. Never commit it. */
  SPOONACULAR_API_KEY: string;
}

const API = 'https://api.spoonacular.com';

// Spoonacular's terms allow caching results for at most one hour.
const CACHE_SECONDS = 3600;

// Each result costs quota (the free plan has 50 points a day), so keep requests small.
const MAX_RESULTS = 20;

/** Plain fields passed on to the app as they are. Everything else in Spoonacular's response is dropped. */
const RECIPE_FIELDS = [
  'id',
  'title',
  'image',
  'readyInMinutes',
  'servings',
  'sourceName',
  'sourceUrl',
  'spoonacularSourceUrl',
  'creditsText',
  'diets',
  'dishTypes',
] as const;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });

interface RawIngredient {
  name?: unknown;
  amount?: unknown;
  unit?: unknown;
  original?: unknown;
}

interface RawInstructionGroup {
  steps?: { step?: unknown }[];
}

/**
 * Flattens a Spoonacular recipe to what the app shows: the plain fields, a short ingredient list and the
 * step text. Spoonacular repeats ingredient and equipment details on every step, which is mostly bulk.
 */
function shapeRecipe(recipe: Record<string, unknown>) {
  const ingredients = Array.isArray(recipe.extendedIngredients) ? (recipe.extendedIngredients as RawIngredient[]) : [];
  const groups = Array.isArray(recipe.analyzedInstructions) ? (recipe.analyzedInstructions as RawInstructionGroup[]) : [];
  return {
    ...Object.fromEntries(RECIPE_FIELDS.filter((field) => field in recipe).map((field) => [field, recipe[field]])),
    ingredients: ingredients.map(({ name, amount, unit, original }) => ({ name, amount, unit, original })),
    steps: groups
      .flatMap((group) => group.steps ?? [])
      .map((s) => s.step)
      .filter((step): step is string => typeof step === 'string' && step.trim() !== ''),
  };
}

/** A whole number from a query parameter, kept within 0..max. */
function wholeNumber(raw: string | null, fallback: number, max: number): number {
  const n = Number(raw);
  return raw !== null && Number.isInteger(n) ? Math.min(Math.max(n, 0), max) : fallback;
}

async function callSpoonacular(path: string, params: Record<string, string>, env: Env): Promise<Response> {
  const url = new URL(path, API);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  url.searchParams.set('apiKey', env.SPOONACULAR_API_KEY);

  return fetch(url, {
    cf: {
      cacheEverything: true,
      // Only cache good answers, so a "daily limit reached" reply isn't remembered.
      cacheTtlByStatus: { '200-299': CACHE_SECONDS, '400-599': 0 },
    },
  });
}

/** Turns an unsuccessful Spoonacular reply into a message the app can show. */
function upstreamError(status: number): Response {
  if (status === 401 || status === 403) return json({ error: 'The recipe service rejected our key.' }, 502);
  if (status === 402 || status === 429) {
    return json({ error: 'The daily recipe limit has been reached. Try again tomorrow.' }, 429);
  }
  return json({ error: 'The recipe service is unavailable right now.' }, 502);
}

async function search(url: URL, env: Env): Promise<Response> {
  const query = (url.searchParams.get('q') ?? '').trim();
  if (!query) return json({ error: 'Type something to search for.' }, 400);

  const upstream = await callSpoonacular(
    '/recipes/complexSearch',
    {
      query: query.slice(0, 100),
      number: String(wholeNumber(url.searchParams.get('number'), 10, MAX_RESULTS) || 10),
      offset: String(wholeNumber(url.searchParams.get('offset'), 0, 900)),
      // One call returns everything the app needs, rather than one more per recipe.
      addRecipeInformation: 'true',
      instructionsRequired: 'true',
    },
    env,
  );
  if (!upstream.ok) return upstreamError(upstream.status);

  const data = (await upstream.json()) as { results?: Record<string, unknown>[]; totalResults?: number };
  return json({ recipes: (data.results ?? []).map(shapeRecipe), total: data.totalResults ?? 0 });
}

async function random(url: URL, env: Env): Promise<Response> {
  const upstream = await callSpoonacular(
    '/recipes/random',
    { number: String(wholeNumber(url.searchParams.get('number'), 5, MAX_RESULTS) || 5) },
    env,
  );
  if (!upstream.ok) return upstreamError(upstream.status);

  const data = (await upstream.json()) as { recipes?: Record<string, unknown>[] };
  return json({ recipes: (data.recipes ?? []).map(shapeRecipe) });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'GET') return json({ error: 'Method not allowed.' }, 405);

    const url = new URL(request.url);
    try {
      switch (url.pathname) {
        case '/health':
          return new Response('ok');
        case '/recipes/search':
          return await search(url, env);
        case '/recipes/random':
          return await random(url, env);
        default:
          return json({ error: 'Not found.' }, 404);
      }
    } catch (e) {
      console.error('Request failed', e);
      return json({ error: 'Something went wrong.' }, 500);
    }
  },
};
