import { useState, useMemo, useRef } from 'react'
import { formatWeight } from '../utils/nutrition'
import { FoodItemForm } from './FoodItemForm'
import type { FoodItem, Recipe, WeightUnit } from '../types'

type Result = { kind: 'food'; item: FoodItem } | { kind: 'recipe'; item: Recipe }

interface Props {
  allFoodItems: FoodItem[]
  allRecipes?: Recipe[]
  weightUnit: WeightUnit
  placeholder?: string
  noLibrary?: boolean
  onSelectFood: (food: FoodItem) => void
  onSelectRecipe?: (recipe: Recipe) => void
  extraActions?: React.ReactNode
}

export function FoodSearch({
  allFoodItems, allRecipes, weightUnit,
  placeholder = 'Search food library...',
  noLibrary,
  onSelectFood, onSelectRecipe,
  extraActions,
}: Props) {
  const [search, setSearch] = useState('')
  const [focused, setFocused] = useState(false)
  const [showFoodForm, setShowFoodForm] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const results = useMemo((): Result[] => {
    if (!search.trim()) return []
    const q = search.toLowerCase()
    const foods = allFoodItems
      .filter(f => f.name.toLowerCase().includes(q) || f.brand?.toLowerCase().includes(q))
      .slice(0, 4)
      .map((item): Result => ({ kind: 'food', item }))
    const recipes = (allRecipes ?? [])
      .filter(r => r.name.toLowerCase().includes(q))
      .slice(0, 3)
      .map((item): Result => ({ kind: 'recipe', item }))
    return [...foods, ...recipes]
  }, [search, allFoodItems, allRecipes])

  function select(result: Result) {
    if (result.kind === 'food') onSelectFood(result.item)
    else onSelectRecipe?.(result.item)
    setSearch('')
    inputRef.current?.focus()
  }

  if (noLibrary) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowFoodForm(true)}
          className="w-full border border-dashed border-gray-300 rounded-lg px-3 py-1.5 text-sm text-brand-600 hover:bg-brand-50 text-left"
        >
          + Add your first food item
        </button>
        {showFoodForm && <FoodItemForm onClose={() => setShowFoodForm(false)} />}
      </>
    )
  }

  return (
    <>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          className="w-full border border-dashed border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-600 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-solid"
        />
        {focused && (
          <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 overflow-hidden">
            {results.map((result, i) => (
              <button
                key={i}
                type="button"
                onMouseDown={e => { e.preventDefault(); select(result) }}
                className="w-full text-left px-3 py-2 hover:bg-brand-50 flex items-center justify-between gap-3 text-sm border-b border-gray-100 last:border-0"
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  <span className="font-medium text-gray-900 truncate">{result.item.name}</span>
                  {result.kind === 'food' && result.item.brand && (
                    <span className="text-gray-400 truncate">{result.item.brand}</span>
                  )}
                  {result.kind === 'recipe' && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">Recipe</span>
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
              className={`w-full text-left px-3 py-2 hover:bg-brand-50 text-sm text-brand-600${extraActions ? ' border-b border-gray-100' : ''}`}
            >
              + Add new food item
            </button>
            {extraActions}
          </div>
        )}
      </div>
      {showFoodForm && <FoodItemForm onClose={() => setShowFoodForm(false)} />}
    </>
  )
}
