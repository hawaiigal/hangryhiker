import { useState, useMemo, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router'
import { db } from '../db'
import { useSettingsStore } from '../store/settingsStore'
import { computeIngredientTotals, formatWeight } from '../utils/nutrition'
import { useLiveQuery } from '../hooks/useLiveQuery'
import { NutritionSummary } from '../components/NutritionSummary'
import type { FoodItem, RecipeIngredient } from '../types'

export function RecipeEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { weightUnit } = useSettingsStore()
  const isNew = !id
  const searchRef = useRef<HTMLInputElement>(null)

  const recipe = useLiveQuery(
    () => (id ? db.recipes.get(Number(id)) : undefined),
    [id],
  )
  const allFoodItems = useLiveQuery(() => db.foodItems.toArray(), [])

  const [name, setName] = useState('')
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([])
  const [search, setSearch] = useState('')
  const [nameError, setNameError] = useState('')
  // Track whether we've seeded state from the loaded recipe (edit mode only)
  const [initialized, setInitialized] = useState(isNew)

  useEffect(() => {
    if (!initialized && recipe != null) {
      setName(recipe.name)
      setIngredients(recipe.ingredients)
      setInitialized(true)
    }
  }, [recipe, initialized, isNew])

  const foodMap = useMemo(() => {
    if (!allFoodItems) return new Map<number, FoodItem>()
    return new Map(allFoodItems.map(f => [f.id!, f]))
  }, [allFoodItems])

  const searchResults = useMemo(() => {
    if (!allFoodItems || !search.trim()) return []
    const q = search.toLowerCase()
    return allFoodItems
      .filter(f => f.name.toLowerCase().includes(q) || f.brand?.toLowerCase().includes(q))
      .slice(0, 7)
  }, [allFoodItems, search])

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
    setSearch('')
    searchRef.current?.focus()
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
    const data = { name: name.trim(), ingredients }
    if (isNew) {
      await db.recipes.add(data)
    } else {
      await db.recipes.update(Number(id), data)
    }
    navigate('/recipes')
  }

  // Show nothing while loading an existing recipe
  if (!isNew && !initialized) return null

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/recipes" className="text-gray-400 hover:text-gray-600 text-sm">
          ← Recipes
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900">
          {isNew ? 'New recipe' : 'Edit recipe'}
        </h1>
      </div>

      {/* Recipe name */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Recipe name *</label>
        <input
          className={inputCls}
          value={name}
          onChange={e => { setName(e.target.value); setNameError('') }}
          placeholder="e.g. Backcountry Mac & Cheese"
        />
        {nameError && <p className="text-sm text-red-600 mt-1">{nameError}</p>}
      </div>

      {/* Ingredient picker */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Add ingredients</label>
        <div className="relative">
          <input
            ref={searchRef}
            className={inputCls}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search food library..."
          />
          {searchResults.length > 0 && (
            <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 overflow-hidden">
              {searchResults.map(food => (
                <button
                  key={food.id}
                  type="button"
                  onClick={() => addIngredient(food)}
                  className="w-full text-left px-4 py-2.5 hover:bg-blue-50 flex items-center justify-between gap-4 text-sm border-b border-gray-100 last:border-0"
                >
                  <span>
                    <span className="font-medium text-gray-900">{food.name}</span>
                    {food.brand && <span className="text-gray-400 ml-1.5">{food.brand}</span>}
                  </span>
                  <span className="text-gray-400 shrink-0">
                    {formatWeight(food.servingSizeG, weightUnit)} / serving
                  </span>
                </button>
              ))}
            </div>
          )}
          {search.trim() && searchResults.length === 0 && allFoodItems !== undefined && (
            <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 px-4 py-3 text-sm text-gray-400">
              No matching food items.{' '}
              <Link to="/" className="text-blue-600 hover:underline">
                Add one to your food library.
              </Link>
            </div>
          )}
        </div>
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
                      className="w-14 text-center border border-gray-300 rounded px-1 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
            Recipe totals
          </p>
          <NutritionSummary totals={totals} weightUnit={weightUnit} />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Link
          to="/recipes"
          className="flex-1 text-center border border-gray-300 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50"
        >
          Cancel
        </Link>
        <button
          type="button"
          onClick={handleSave}
          className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700"
        >
          {isNew ? 'Save recipe' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}
