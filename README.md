# Hangry Hiker

**[hangryhiker.kailani.io](https://hangryhiker.kailani.io)** — A browser-based app for planning food and nutrition on backpacking trips. All data is stored locally in IndexedDB — no account or backend required.

## Features

- **Food Library** — add food items with nutrition info (calories, protein, fat, carbs, sodium, fiber); sort by cal/oz; search USDA FoodData Central or scan a nutrition label with OCR
- **Recipe Builder** — combine food items into reusable recipes (e.g. "oatmeal kit")
- **Trip Planner** — organize days and meals, assign food or recipes, see live nutrition totals and a shopping list
- **Import / Export** — back up and restore data as JSON; import deduplicates food items and recipes by name+brand with skip / overwrite / keep-both strategies
- oz/g toggle for weight display

## Tech Stack

| | |
|---|---|
| Framework | React 19 + TypeScript 6 |
| Build | Vite 8 |
| Styling | Tailwind CSS 4 |
| UI Components | shadcn/ui (Radix UI primitives + class-variance-authority) |
| Storage | Dexie.js (IndexedDB) |
| State | Zustand 5 |
| Routing | React Router 7 |
| Hosting | Cloudflare Pages |

## Getting Started

```bash
nvm use          # switches to Node 24 via .nvmrc
pnpm install
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173).

## Build & Deploy

```bash
pnpm build       # outputs to dist/
```

Deploy by pushing to the branch connected to Cloudflare Pages. The `dist/` folder is the publish directory.

## Project Structure

```
src/
  components/
    ui/          # shadcn/ui components (Button, Dialog, DropdownMenu, Input, Label)
  db/            # Dexie database schema and table definitions
  hooks/         # Custom React hooks
  lib/           # Shared utilities (cn() helper)
  pages/         # Top-level route components
  store/         # Zustand stores
  types/         # Shared TypeScript types
  utils/         # Pure utility functions (nutrition math, unit conversion, import/export)
```

## Data Model

All weights are stored internally in grams; the UI converts to oz or g based on the toggle.

- `FoodItem` — name, brand, serving size (g), calories, macros, sodium
- `Recipe` — name, servings count, list of food items with quantities
- `Trip` — name, list of days
- `Day` — date, meals (breakfast / lunch / dinner / snacks)
- `Meal` — list of food items or recipes with serving counts

## Export Format

Exports are JSON files with a `schemaVersion` field:

- **v1** — single-trip export (legacy). Contains one trip + its referenced food items and recipes.
- **v2** — flexible export. Contains any combination of trips, food items, and recipes. Used for full backups and library-only exports.

Both formats are supported on import.
