import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { computeMealTotals, formatWeight } from '../utils/nutrition'
import { NutritionSummary } from './NutritionSummary'
import { FoodSearch } from './FoodSearch'
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

export function MealSection({
  mealType, label, items, foodMap, recipeMap,
  allFoodItems, allRecipes, weightUnit,
  onAdd, onSetServings, onRemove,
}: Props) {
  const location = useLocation()
  const [editingFood, setEditingFood] = useState<FoodItem | undefined>(undefined)

  const totals = useMemo(
    () => computeMealTotals(items, foodMap, recipeMap),
    [items, foodMap, recipeMap],
  )

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
                <div className="text-sm font-medium truncate flex items-center gap-1.5">
                  {food ? (
                    <button
                      type="button"
                      onClick={() => setEditingFood(food)}
                      className="text-gray-900 hover:text-brand-600 hover:underline truncate text-left"
                    >
                      {name}
                    </button>
                  ) : recipe ? (
                    <Link
                      to={`/recipes/${recipe.id}`}
                      state={{ returnTo: location.pathname }}
                      className="text-gray-900 hover:text-brand-600 hover:underline truncate"
                    >
                      {name}
                    </Link>
                  ) : name}
                  {recipe && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-normal shrink-0">
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
        <FoodSearch
          allFoodItems={allFoodItems}
          allRecipes={allRecipes}
          weightUnit={weightUnit}
          placeholder={`Add to ${mealType}...`}
          noLibrary={noLibrary}
          onSelectFood={food => onAdd({ foodItemId: food.id!, servings: 1 })}
          onSelectRecipe={recipe => onAdd({ recipeId: recipe.id!, servings: 1 })}
          extraActions={
            <Link
              to="/recipes/new"
              state={{ returnTo: location.pathname }}
              onMouseDown={e => e.preventDefault()}
              className="block px-3 py-2 hover:bg-brand-50 text-sm text-brand-600"
            >
              + Create a recipe
            </Link>
          }
        />
      </div>
    </div>
    {editingFood && (
      <FoodItemForm item={editingFood} onClose={() => setEditingFood(undefined)} />
    )}
    </>
  )
}
