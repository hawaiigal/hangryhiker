import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router'
import { db } from '../db'
import { useSettingsStore } from '../store/settingsStore'
import { computeIngredientTotals, formatWeight, scaleTotals } from '../utils/nutrition'
import { useLiveQuery } from '../hooks/useLiveQuery'
import { NutritionSummary } from '../components/NutritionSummary'
import { FoodSearch } from '../components/FoodSearch'
import type { FoodItem, RecipeIngredient } from '../types'

export function RecipeEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { state: routeState } = useLocation()
  const returnTo: string = routeState?.returnTo ?? '/recipes'
  const { weightUnit } = useSettingsStore()
  const isNew = !id

  const recipe = useLiveQuery(
    () => (id ? db.recipes.get(Number(id)) : undefined),
    [id],
  )
  const allFoodItems = useLiveQuery(() => db.foodItems.toArray(), [])

  const [name, setName] = useState('')
  const [servings, setServings] = useState(1)
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([])
  const [nameError, setNameError] = useState('')
  // Track whether we've seeded state from the loaded recipe (edit mode only)
  const [initialized, setInitialized] = useState(isNew)

  useEffect(() => {
    if (!initialized && recipe != null) {
      setName(recipe.name)
      setServings(recipe.servings)
      setIngredients(recipe.ingredients)
      setInitialized(true)
    }
  }, [recipe, initialized, isNew])

  const foodMap = useMemo(() => {
    if (!allFoodItems) return new Map<number, FoodItem>()
    return new Map(allFoodItems.map(f => [f.id!, f]))
  }, [allFoodItems])

  const totals = useMemo(
    () => computeIngredientTotals(ingredients, foodMap),
    [ingredients, foodMap],
  )

  function addIngredient(food: FoodItem) {
    setIngredients(prev => {
      const existing = prev.find(i => i.foodItemId === food.id!)
      if (existing) {
        return prev.map(i =>
          i.foodItemId === food.id! ? { ...i, quantity: i.quantity + 1 } : i,
        )
      }
      return [...prev, { foodItemId: food.id!, quantity: 1 }]
    })
  }

  function setQuantity(foodItemId: number, raw: string) {
    const qty = parseFloat(raw)
    if (isNaN(qty) || qty <= 0) {
      setIngredients(prev => prev.filter(i => i.foodItemId !== foodItemId))
    } else {
      setIngredients(prev =>
        prev.map(i => (i.foodItemId === foodItemId ? { ...i, quantity: qty } : i)),
      )
    }
  }

  function removeIngredient(foodItemId: number) {
    setIngredients(prev => prev.filter(i => i.foodItemId !== foodItemId))
  }

  async function handleSave() {
    if (!name.trim()) {
      setNameError('Recipe name is required.')
      return
    }
    setNameError('')
    const data = { name: name.trim(), servings, ingredients }
    if (isNew) {
      await db.recipes.add(data)
    } else {
      await db.recipes.update(Number(id), data)
    }
    navigate(returnTo)
  }

  // Show nothing while loading an existing recipe
  if (!isNew && !initialized) return null

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600'

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link to={returnTo} className="text-gray-400 hover:text-gray-600 text-sm">
          ←
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900">
          {isNew ? 'New recipe' : 'Edit recipe'}
        </h1>
      </div>

      {/* Recipe name + servings */}
      <div className="mb-6 flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Recipe name *</label>
          <input
            className={inputCls}
            value={name}
            onChange={e => { setName(e.target.value); setNameError('') }}
            placeholder="e.g. Backcountry Mac & Cheese"
          />
          {nameError && <p className="text-sm text-red-600 mt-1">{nameError}</p>}
        </div>
        <div className="w-32 shrink-0">
          <label className="block text-sm font-medium text-gray-700 mb-1">Servings</label>
          <input
            className={inputCls}
            type="number"
            min="1"
            step="1"
            value={servings}
            onChange={e => {
              const v = parseInt(e.target.value)
              if (!isNaN(v) && v >= 1) setServings(v)
            }}
          />
        </div>
      </div>

      {/* Ingredient picker */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Add ingredients</label>
        <FoodSearch
          allFoodItems={allFoodItems ?? []}
          weightUnit={weightUnit}
          placeholder="Search food library..."
          onSelectFood={addIngredient}
        />
      </div>

      {/* Ingredient list */}
      {ingredients.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-700 mb-2">
            Ingredients ({ingredients.length})
          </h2>
          <div className="space-y-2">
            {ingredients.map(({ foodItemId, quantity }) => {
              const food = foodMap.get(foodItemId)
              if (!food) return null
              return (
                <div
                  key={foodItemId}
                  className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-sm truncate">{food.name}</div>
                    <div className="text-xs text-gray-400">
                      {formatWeight(food.servingSizeG * quantity, weightUnit)} · {Math.round(food.calories * quantity)} cal
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setQuantity(foodItemId, String(quantity - 0.5))}
                      className="w-7 h-7 flex items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={quantity}
                      onChange={e => setQuantity(foodItemId, e.target.value)}
                      className="w-14 text-center border border-gray-300 rounded px-1 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity(foodItemId, String(quantity + 0.5))}
                      className="w-7 h-7 flex items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0 hidden sm:block">
                    serving{quantity !== 1 ? 's' : ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeIngredient(foodItemId)}
                    className="text-gray-300 hover:text-red-500 text-lg leading-none shrink-0"
                    aria-label="Remove"
                  >
                    ×
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Totals */}
      {ingredients.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-4 mb-6">
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              Per serving
            </p>
            <p className="text-xs text-gray-400">of {servings}</p>
          </div>
          <NutritionSummary totals={scaleTotals(totals, 1 / servings)} weightUnit={weightUnit} />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Link
          to={returnTo}
          className="flex-1 text-center border border-gray-300 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50"
        >
          Cancel
        </Link>
        <button
          type="button"
          onClick={handleSave}
          className="flex-1 bg-brand-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-brand-700"
        >
          {isNew ? 'Save recipe' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}
