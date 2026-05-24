import { useMemo } from 'react'
import { Link } from 'react-router'
import { db } from '../db'
import { useSettingsStore } from '../store/settingsStore'
import { computeIngredientTotals } from '../utils/nutrition'
import { useLiveQuery } from '../hooks/useLiveQuery'
import { NutritionSummary } from '../components/NutritionSummary'
import type { FoodItem } from '../types'

export function RecipeList() {
  const { weightUnit } = useSettingsStore()
  const recipes = useLiveQuery(() => db.recipes.toArray(), [])
  const allFoodItems = useLiveQuery(() => db.foodItems.toArray(), [])

  const foodMap = useMemo(() => {
    if (!allFoodItems) return new Map<number, FoodItem>()
    return new Map(allFoodItems.map(f => [f.id!, f]))
  }, [allFoodItems])

  async function handleDelete(id: number, name: string) {
    if (confirm(`Delete "${name}"?`)) {
      await db.recipes.delete(id)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Recipes</h1>
        <Link
          to="/recipes/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + New recipe
        </Link>
      </div>

      {recipes && recipes.length === 0 && (
        <div className="py-16 text-center text-gray-400 text-sm">
          No recipes yet.{' '}
          <Link to="/recipes/new" className="text-blue-600 hover:underline">
            Create your first recipe.
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {recipes?.map(recipe => {
          const totals = computeIngredientTotals(recipe.ingredients, foodMap)
          return (
            <div
              key={recipe.id}
              className="bg-white border border-gray-200 rounded-xl px-5 py-4 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-medium text-gray-900 mb-1">{recipe.name}</div>
                  <div className="text-xs text-gray-400 mb-2">
                    {recipe.ingredients.length} ingredient{recipe.ingredients.length !== 1 ? 's' : ''}
                  </div>
                  <NutritionSummary totals={totals} weightUnit={weightUnit} compact />
                </div>
                <div className="flex gap-3 text-sm shrink-0">
                  <Link
                    to={`/recipes/${recipe.id}`}
                    className="text-gray-400 hover:text-blue-600"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(recipe.id!, recipe.name)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
