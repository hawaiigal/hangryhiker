import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { db } from '../db'
import { useSettingsStore } from '../store/settingsStore'
import { computeIngredientTotals } from '../utils/nutrition'
import { useLiveQuery } from '../hooks/useLiveQuery'
import { NutritionSummary } from '../components/NutritionSummary'
import { Button } from '@/components/ui/button'
import { PageHeader } from '../components/PageHeader'
import { ConfirmDialog } from '../components/ConfirmDialog'
import type { FoodItem } from '../types'

export function RecipeList() {
  const { weightUnit } = useSettingsStore()
  const [pendingDelete, setPendingDelete] = useState<{ id: number; name: string } | null>(null)
  const recipes = useLiveQuery(() => db.recipes.toArray(), [])
  const allFoodItems = useLiveQuery(() => db.foodItems.toArray(), [])

  const foodMap = useMemo(() => {
    if (!allFoodItems) return new Map<number, FoodItem>()
    return new Map(allFoodItems.map(f => [f.id!, f]))
  }, [allFoodItems])

  async function handleDeleteConfirm() {
    if (pendingDelete) await db.recipes.delete(pendingDelete.id)
  }

  return (
    <div>
      <PageHeader
        title="Recipes"
        action={
          <Button asChild>
            <Link to="/recipes/new">+ New recipe</Link>
          </Button>
        }
      />

      {recipes && recipes.length === 0 && (
        <div className="py-16 text-center text-gray-400 text-sm">
          No recipes yet.{' '}
          <Link to="/recipes/new" className="text-brand-600 hover:underline">
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
                    {recipe.ingredients.length} ingredient{recipe.ingredients.length !== 1 ? 's' : ''} · {recipe.servings} serving{recipe.servings !== 1 ? 's' : ''}
                  </div>
                  <NutritionSummary totals={totals} weightUnit={weightUnit} compact />
                </div>
                <div className="flex gap-3 text-sm shrink-0">
                  <Link to={`/recipes/${recipe.id}`} className="text-gray-400 hover:text-brand-600">
                    Edit
                  </Link>
                  <button
                    onClick={() => setPendingDelete({ id: recipe.id!, name: recipe.name })}
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

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={open => { if (!open) setPendingDelete(null) }}
        title={`Delete "${pendingDelete?.name}"?`}
        description="This will permanently delete the recipe."
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
