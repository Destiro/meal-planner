# Meal Planner

Expo (React Native + TypeScript) app, built for Android.

## Run it
    npm install
    npx expo start

Then scan the QR code with the Expo Go app on your Android phone,
or press `a` to open an Android emulator.

## Structure
- `App.tsx` – tab navigation (Plan, Recipes, Shopping)
- `src/store.tsx` – app state + saving to the phone (AsyncStorage)
- `src/types.ts` – Recipe / MealPlan data shapes
- `src/theme.ts` – colours, spacing, text styles
- `src/screens/` – one file per screen
- `src/components/` – shared UI pieces
