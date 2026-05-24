import { useReducer, useState, useEffect, useMemo, useRef } from 'react'
import { useParams, Link } from 'react-router'
import { db } from '../db'
import { useSettingsStore } from '../store/settingsStore'
import { computeMealTotals, computeTripTotals, addTotals, emptyTotals } from '../utils/nutrition'
import { MEAL_TYPES, MEAL_LABELS, createEmptyDays } from '../utils/trip'
import { useLiveQuery } from '../hooks/useLiveQuery'
import { NutritionSummary } from '../components/NutritionSummary'
import { MealSection } from '../components/MealSection'
import type { FoodItem, MealItem, MealType, NutritionTotals, Recipe, Trip, TripDay } from '../types'

// ── Reducer ────────────────────────────────────────────────────────────────

interface TripState {
  name: string
  days: TripDay[]
}

type TripAction =
  | { type: 'INIT'; trip: Trip }
  | { type: 'SET_NAME'; name: string }
  | { type: 'ADD_DAY' }
  | { type: 'REMOVE_LAST_DAY' }
  | { type: 'ADD_ITEM'; dayIndex: number; mealType: MealType; item: MealItem }
  | { type: 'SET_SERVINGS'; dayIndex: number; mealType: MealType; itemIndex: number; servings: number }
  | { type: 'REMOVE_ITEM'; dayIndex: number; mealType: MealType; itemIndex: number }

function updateMeal(
  state: TripState,
  dayIndex: number,
  mealType: MealType,
  updater: (items: MealItem[]) => MealItem[],
): TripState {
  return {
    ...state,
    days: state.days.map((day, di) => {
      if (di !== dayIndex) return day
      return {
        ...day,
        meals: day.meals.map(meal =>
          meal.type === mealType ? { ...meal, items: updater(meal.items) } : meal,
        ),
      }
    }),
  }
}

function tripReducer(state: TripState, action: TripAction): TripState {
  switch (action.type) {
    case 'INIT':
      return { name: action.trip.name, days: action.trip.days }
    case 'SET_NAME':
      return { ...state, name: action.name }
    case 'ADD_DAY':
      return {
        ...state,
        days: [...state.days, ...createEmptyDays(1).map(d => ({
          ...d,
          date: `Day ${state.days.length + 1}`,
        }))],
      }
    case 'REMOVE_LAST_DAY':
      return state.days.length <= 1 ? state : { ...state, days: state.days.slice(0, -1) }
    case 'ADD_ITEM':
      return updateMeal(state, action.dayIndex, action.mealType, items => [...items, action.item])
    case 'SET_SERVINGS':
      return updateMeal(state, action.dayIndex, action.mealType, items =>
        items.map((item, i) => i === action.itemIndex ? { ...item, servings: action.servings } : item),
      )
    case 'REMOVE_ITEM':
      return updateMeal(state, action.dayIndex, action.mealType, items =>
        items.filter((_, i) => i !== action.itemIndex),
      )
  }
}

// ── Component ──────────────────────────────────────────────────────────────

type SaveStatus = 'idle' | 'saving' | 'saved'

export function TripEditor() {
  const { id } = useParams()
  const { weightUnit } = useSettingsStore()

  const tripFromDb = useLiveQuery(() => db.trips.get(Number(id)), [id])
  const allFoodItems = useLiveQuery(() => db.foodItems.toArray(), [])
  const allRecipes = useLiveQuery(() => db.recipes.toArray(), [])

  const foodMap = useMemo(
    () => new Map<number, FoodItem>((allFoodItems ?? []).map(f => [f.id!, f])),
    [allFoodItems],
  )
  const recipeMap = useMemo(
    () => new Map<number, Recipe>((allRecipes ?? []).map(r => [r.id!, r])),
    [allRecipes],
  )

  const [state, dispatch] = useReducer(tripReducer, { name: '', days: [] })
  const [activeDay, setActiveDay] = useState(0)
  const [initialized, setInitialized] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const justInited = useRef(false)

  // Seed local state once the DB record arrives
  useEffect(() => {
    if (!initialized && tripFromDb != null) {
      justInited.current = true
      dispatch({ type: 'INIT', trip: tripFromDb })
      setInitialized(true)
    }
  }, [tripFromDb, initialized])

  // Auto-save on every state change, debounced 600ms
  useEffect(() => {
    if (!initialized) return
    if (justInited.current) { justInited.current = false; return }

    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaveStatus('idle')

    saveTimer.current = setTimeout(async () => {
      setSaveStatus('saving')
      await db.trips.update(Number(id), { name: state.name, days: state.days })
      setSaveStatus('saved')
      saveTimer.current = setTimeout(() => setSaveStatus('idle'), 2000)
    }, 600)

    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [state, initialized, id])

  const tripTotals = useMemo(
    () => initialized ? computeTripTotals({ name: state.name, days: state.days }, foodMap, recipeMap) : emptyTotals(),
    [state, foodMap, recipeMap, initialized],
  )

  const dayTotals = useMemo((): NutritionTotals => {
    if (!initialized || !state.days[activeDay]) return emptyTotals()
    return state.days[activeDay].meals.reduce(
      (acc, meal) => addTotals(acc, computeMealTotals(meal.items, foodMap, recipeMap)),
      emptyTotals(),
    )
  }, [state, activeDay, foodMap, recipeMap, initialized])

  // Loading / not-found guards (after all hooks)
  if (!initialized) {
    if (allFoodItems !== undefined && tripFromDb === undefined) {
      return (
        <div className="py-16 text-center text-gray-400 text-sm">
          Trip not found.{' '}
          <Link to="/trips" className="text-blue-600 hover:underline">Back to trips</Link>
        </div>
      )
    }
    return null
  }

  const currentDay = state.days[activeDay]
  const safeDay = Math.min(activeDay, state.days.length - 1)
  if (safeDay !== activeDay) setActiveDay(safeDay)

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Link to="/trips" className="text-gray-400 hover:text-gray-600 text-sm shrink-0">
            ← Trips
          </Link>
          <input
            value={state.name}
            onChange={e => dispatch({ type: 'SET_NAME', name: e.target.value })}
            className="text-xl font-semibold text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-0 py-0.5 min-w-0"
          />
        </div>
        <span className="text-xs text-gray-400 shrink-0 pt-1.5">
          {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved ✓' : ''}
        </span>
      </div>

      {/* Trip totals */}
      {tripTotals.calories > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-5">
          <p className="text-xs font-medium text-blue-400 uppercase tracking-wide mb-1">
            Trip total — {state.days.length} day{state.days.length !== 1 ? 's' : ''}
          </p>
          <NutritionSummary totals={tripTotals} weightUnit={weightUnit} />
        </div>
      )}

      {/* Day tabs */}
      <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1">
        {state.days.map((day, i) => (
          <button
            key={i}
            onClick={() => setActiveDay(i)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              i === activeDay
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {day.date}
          </button>
        ))}
        <button
          onClick={() => { dispatch({ type: 'ADD_DAY' }); setActiveDay(state.days.length) }}
          className="shrink-0 px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-blue-600 hover:bg-blue-50"
          title="Add day"
        >
          + Day
        </button>
        {state.days.length > 1 && (
          <button
            onClick={() => {
              const lastHasItems = state.days[state.days.length - 1].meals.some(m => m.items.length > 0)
              if (!lastHasItems || confirm(`Remove ${state.days[state.days.length - 1].date}? It has items.`)) {
                dispatch({ type: 'REMOVE_LAST_DAY' })
              }
            }}
            className="shrink-0 px-2 py-1.5 rounded-lg text-sm text-gray-400 hover:text-red-500 hover:bg-red-50"
            title="Remove last day"
          >
            − Day
          </button>
        )}
      </div>

      {/* Meal sections for active day */}
      {currentDay && MEAL_TYPES.map(mealType => {
        const meal = currentDay.meals.find(m => m.type === mealType)
        return (
          <MealSection
            key={mealType}
            mealType={mealType}
            label={MEAL_LABELS[mealType]}
            items={meal?.items ?? []}
            foodMap={foodMap}
            recipeMap={recipeMap}
            allFoodItems={allFoodItems ?? []}
            allRecipes={allRecipes ?? []}
            weightUnit={weightUnit}
            onAdd={item => dispatch({ type: 'ADD_ITEM', dayIndex: activeDay, mealType, item })}
            onSetServings={(index, servings) =>
              dispatch({ type: 'SET_SERVINGS', dayIndex: activeDay, mealType, itemIndex: index, servings })
            }
            onRemove={index =>
              dispatch({ type: 'REMOVE_ITEM', dayIndex: activeDay, mealType, itemIndex: index })
            }
          />
        )
      })}

      {/* Day totals */}
      {dayTotals.calories > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mt-2">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">
            {currentDay?.date} totals
          </p>
          <NutritionSummary totals={dayTotals} weightUnit={weightUnit} />
        </div>
      )}
    </div>
  )
}
