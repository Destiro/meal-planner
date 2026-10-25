# Meal Planner API (Cloudflare Worker)

A tiny proxy between the app and Spoonacular, so the API key stays on Cloudflare and never ships inside the app.

| Route | What it does |
|---|---|
| `GET /recipes/search?q=pasta&number=10&offset=0` | Search, returning ingredients and instructions in one call |
| `GET /recipes/random?number=5` | Random recipes for inspiration |
| `POST /chat` | The cooking assistant. Takes `{ messages, context }` and returns `{ reply }` |
| `GET /health` | Returns `ok` |

Responses are cached for one hour, the most Spoonacular's terms allow. The free plan allows 50 points a day
(a search of 10 recipes costs about 1.4), so caching matters.

The assistant runs on Cloudflare Workers AI (Llama 3.3 70B), bound in `wrangler.jsonc`. It needs no key or
secret. The free plan includes 10,000 "neurons" a day, which is roughly 50 to 70 chat turns; when it runs out
the app shows a "daily limit" message and it works again after 00:00 UTC. To use a cheaper model, change
`CHAT_MODEL` in `src/index.ts`.

## Setup (once)

Needs Node 22 or newer.

```
cd worker
npm install
npx wrangler login                              # opens a browser to sign in to Cloudflare
npx wrangler secret put SPOONACULAR_API_KEY     # paste your key when asked; it is stored on Cloudflare
npx wrangler deploy
```

`deploy` prints the Worker's address, like `https://meal-planner-api.<your-name>.workers.dev`.
Check it with `<address>/health`, which should say `ok`.

## Running it on your computer

Create `worker/.dev.vars` (it is git-ignored) containing:

```
SPOONACULAR_API_KEY="your key"
```

Then `npm run dev` and open <http://localhost:8787/health>.

## Updating

Change `src/index.ts`, then `npm run deploy`. The key stays set between deploys.
