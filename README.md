# Meal Planner

Expo (React Native + TypeScript) app, built for Android.

## Run it
    npm install
    npx expo start

Then scan the QR code with the Expo Go app on your Android phone,
or press `a` to open an Android emulator.

## Structure
- `App.tsx` – tab navigation (Plan, Recipes, Pantry, Shopping)
- `src/store.tsx` – app state + saving to the phone (AsyncStorage)
- `src/types.ts` – Recipe / MealPlan data shapes
- `src/migrate.ts` – saved-data versioning; upgrades older saves on load
- `src/shopping.ts`, `ingredients.ts`, `aisles.ts` – shopping list maths (quantities, units, aisles)
- `src/slots.ts`, `planUtils.ts`, `recipeFields.ts` – pure helpers for meal slots, week copying, tags/links
- `src/pantry.ts`, `shoppingEdits.ts` – pantry subtraction and hand edits to shopping lists
- `src/theme.ts` – colours, spacing, text styles
- `src/screens/` – one file per screen
- `src/components/` – shared UI pieces

## Development
    npm run check       # typecheck + lint + tests (what CI runs)
    npm run typecheck
    npm run lint
    npm test

## GitHub workflows (`.github/`)
- `ci.yml` – on every PR and push to `main`: typecheck, lint, tests, an Android
  bundle build, and an informational `expo-doctor` run.
- `eas-android-build.yml` – builds an installable APK with EAS. Run it from the
  Actions tab, or add the `build-apk` label to a PR.
- `dependabot.yml` – monthly dependency PRs. Expo/React Native packages are
  excluded because they must move together with the Expo SDK.

### One-time setup for EAS builds
1. `npm i -g eas-cli`, then `eas login` and `eas init` in this folder (this links the project).
2. Create an access token at expo.dev (Account settings, Access tokens).
3. In GitHub: Settings, Secrets and variables, Actions, add a secret named `EXPO_TOKEN`.
4. Create a label called `build-apk` in the repo if you want label-triggered builds.

### Recommended branch protection
Settings, Branches, add a rule for `main`: require a pull request and require the
`Typecheck, lint, test` and `Android bundle builds` checks to pass.
