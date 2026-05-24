import { useState, useMemo, useRef } from 'react'
import { Link, useLocation } from 'react-router'
import { computeMealTotals, formatWeight } from '../utils/nutrition'
import { NutritionSummary } from './NutritionSummary'
import { FoodItemForm } from './FoodItemForm'
import type { FoodItem, MealItem, MealType, Recipe, WeightUnit } from '../types'

interface Props {
  mealType: MealType
  label: string
  items: MealItem[]
  foodMap: Map<number, FoodItem>
  recipeMap: Map<number, Recipe>
  allFoodItems: FoodItem[]
  allRecipes: Recipe[]
  weightUnit: WeightUnit
  onAdd: (item: MealItem) => void
  onSetServings: (index: number, servings: number) => void
  onRemove: (index: number) => void
}

type SearchResult =
  | { kind: 'food'; item: FoodItem }
  | { kind: 'recipe'; item: Recipe }

export function MealSection({
  mealType, label, items, foodMap, recipeMap,
  allFoodItems, allRecipes, weightUnit,
  onAdd, onSetServings, onRemove,
}: Props) {
  const location = useLocation()
  const [search, setSearch] = useState('')
  const [focused, setFocused] = useState(false)
  const [showFoodForm, setShowFoodForm] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const results = useMemo((): SearchResult[] => {
    if (!search.trim()) return []
    const q = search.toLowerCase()
    const foods = allFoodItems
      .filter(f => f.name.toLowerCase().includes(q) || f.brand?.toLowerCase().includes(q))
      .slice(0, 4)
      .map((item): SearchResult => ({ kind: 'food', item }))
    const recipes = allRecipes
      .filter(r => r.name.toLowerCase().includes(q))
      .slice(0, 3)
      .map((item): SearchResult => ({ kind: 'recipe', item }))
    return [...foods, ...recipes]
  }, [search, allFoodItems, allRecipes])

  const totals = useMemo(
    () => computeMealTotals(items, foodMap, recipeMap),
    [items, foodMap, recipeMap],
  )

  function addResult(result: SearchResult) {
    if (result.kind === 'food') {
      onAdd({ foodItemId: result.item.id!, servings: 1 })
    } else {
      onAdd({ recipeId: result.item.id!, servings: 1 })
    }
    setSearch('')
    inputRef.current?.focus()
  }

  function adjustServings(index: number, current: number, delta: number) {
    const next = Math.max(0.5, Math.round((current + delta) * 2) / 2)
    onSetServings(index, next)
  }

  const hasItems = items.length > 0
  const noLibrary = allFoodItems.length === 0 && allRecipes.length === 0

  return (
    <>
    <div className="border border-gray-200 rounded-xl mb-3">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200 rounded-t-xl">
        <span className="text-sm font-semibold text-gray-700">{label}</span>
        {hasItems && (
          <NutritionSummary totals={totals} weightUnit={weightUnit} compact />
        )}
      </div>

      <div className="px-4 py-3 space-y-2">
        {/* Item list */}
        {items.map((item, index) => {
          const food = item.foodItemId != null ? foodMap.get(item.foodItemId) : undefined
          const recipe = item.recipeId != null ? recipeMap.get(item.recipeId) : undefined
          const name = food?.name ?? recipe?.name ?? '(unknown)'
          const weightG = food
            ? food.servingSizeG * item.servings
            : recipe
              ? computeMealTotals([item], foodMap, recipeMap).weightG
              : 0
          const cal = food
            ? Math.round(food.calories * item.servings)
            : recipe
              ? Math.round(computeMealTotals([item], foodMap, recipeMap).calories)
              : 0

          return (
            <div key={index} className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate flex items-center gap-1.5">
                  {name}
                  {recipe && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-normal">
                      Recipe
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-400">
                  {formatWeight(weightG, weightUnit)} · {cal} cal
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => adjustServings(index, item.servings, -0.5)}
                  className="w-6 h-6 flex items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-50 text-xs"
                >
                  −
                </button>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={item.servings}
                  onChange={e => {
                    const v = parseFloat(e.target.value)
                    if (!isNaN(v) && v > 0) onSetServings(index, v)
                  }}
                  className="w-12 text-center border border-gray-300 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-600"
                />
                <button
                  type="button"
                  onClick={() => adjustServings(index, item.servings, 0.5)}
                  className="w-6 h-6 flex items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-50 text-xs"
                >
                  +
                </button>
              </div>
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="text-gray-300 hover:text-red-500 text-lg leading-none shrink-0"
                aria-label="Remove"
              >
                ×
              </button>
            </div>
          )
        })}

        {/* Search */}
        <div className="relative">
          {noLibrary ? (
            <button
              type="button"
              onClick={() => setShowFoodForm(true)}
              className="w-full border border-dashed border-gray-300 rounded-lg px-3 py-1.5 text-sm text-brand-600 hover:bg-brand-50 text-left"
            >
              + Add your first food item
            </button>
          ) : (
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={`Add to ${mealType}...`}
              className="w-full border border-dashed border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-600 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-solid"
            />
          )}
          {focused && (
            <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 overflow-hidden">
              {results.map((result, i) => (
                <button
                  key={i}
                  type="button"
                  onMouseDown={e => { e.preventDefault(); addResult(result) }}
                  className="w-full text-left px-3 py-2 hover:bg-brand-50 flex items-center justify-between gap-3 text-sm border-b border-gray-100 last:border-0"
                >
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span className="font-medium text-gray-900 truncate">
                      {result.kind === 'food' ? result.item.name : result.item.name}
                    </span>
                    {result.kind === 'food' && result.item.brand && (
                      <span className="text-gray-400 truncate">{result.item.brand}</span>
                    )}
                    {result.kind === 'recipe' && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                        Recipe
                      </span>
                    )}
                  </span>
                  <span className="text-gray-400 text-xs shrink-0">
                    {result.kind === 'food'
                      ? `${formatWeight(result.item.servingSizeG, weightUnit)}/serving`
                      : `${result.item.ingredients.length} ingredients`}
                  </span>
                </button>
              ))}
              {search.trim() && results.length === 0 && (
                <div className="px-3 py-2 text-xs text-gray-400">No matches</div>
              )}
              {results.length > 0 && <div className="border-t border-gray-100" />}
              <button
                type="button"
                onMouseDown={e => { e.preventDefault(); setShowFoodForm(true) }}
                className="w-full text-left px-3 py-2 hover:bg-brand-50 text-sm text-brand-600 border-b border-gray-100"
              >
                + Add new food item
              </button>
              <Link
                to="/recipes/new"
                state={{ returnTo: location.pathname }}
                onMouseDown={e => e.preventDefault()}
                className="block px-3 py-2 hover:bg-brand-50 text-sm text-brand-600"
              >
                + Create a recipe
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
    {showFoodForm && <FoodItemForm onClose={() => setShowFoodForm(false)} />}
    </>
  )
}

