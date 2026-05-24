import { useMemo } from 'react'
import { Link } from 'react-router'
import { db } from '../db'
import { useSettingsStore } from '../store/settingsStore'
import { computeTripTotals, formatWeight } from '../utils/nutrition'
import { useLiveQuery } from '../hooks/useLiveQuery'
import type { FoodItem, Recipe } from '../types'

export function Dashboard() {
  const { weightUnit } = useSettingsStore()

  const trips = useLiveQuery(() => db.trips.toArray(), [])
  const recipes = useLiveQuery(() => db.recipes.toArray(), [])
  const foodItems = useLiveQuery(() => db.foodItems.toArray(), [])

  const foodMap = useMemo(
    () => new Map<number, FoodItem>((foodItems ?? []).map(f => [f.id!, f])),
    [foodItems],
  )
  const recipeMap = useMemo(
    () => new Map<number, Recipe>((recipes ?? []).map(r => [r.id!, r])),
    [recipes],
  )

  const recentTrips = useMemo(
    () => (trips ?? []).slice(-3).reverse(),
    [trips],
  )

  const isEmpty = (trips?.length ?? 0) === 0 && (recipes?.length ?? 0) === 0 && (foodItems?.length ?? 0) === 0

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Welcome to Hangry Hiker</h1>
        <p className="text-gray-500 text-sm">Plan your backpacking meals, track nutrition, and pack light.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Link
          to="/trips"
          className="bg-white border border-gray-200 rounded-xl px-5 py-4 hover:border-brand-400 hover:shadow-sm transition-all"
        >
          <div className="text-3xl font-bold text-brand-600 mb-1">{trips?.length ?? '—'}</div>
          <div className="text-sm text-gray-500">Trip{trips?.length !== 1 ? 's' : ''}</div>
        </Link>
        <Link
          to="/recipes"
          className="bg-white border border-gray-200 rounded-xl px-5 py-4 hover:border-brand-400 hover:shadow-sm transition-all"
        >
          <div className="text-3xl font-bold text-brand-600 mb-1">{recipes?.length ?? '—'}</div>
          <div className="text-sm text-gray-500">Recipe{recipes?.length !== 1 ? 's' : ''}</div>
        </Link>
        <Link
          to="/food"
          className="bg-white border border-gray-200 rounded-xl px-5 py-4 hover:border-brand-400 hover:shadow-sm transition-all"
        >
          <div className="text-3xl font-bold text-brand-600 mb-1">{foodItems?.length ?? '—'}</div>
          <div className="text-sm text-gray-500">Food item{foodItems?.length !== 1 ? 's' : ''}</div>
        </Link>
      </div>

      {isEmpty ? (
        <div className="bg-white border border-gray-200 rounded-xl px-6 py-10 text-center space-y-4">
          <p className="text-gray-500 text-sm">Get started by adding some food items, then build recipes and plan your trips.</p>
          <div className="flex justify-center gap-3 flex-wrap">
            <Link to="/food" className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700">
              Add food items
            </Link>
            <Link to="/recipes/new" className="border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
              Create a recipe
            </Link>
            <Link to="/trips/new" className="border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
              Plan a trip
            </Link>
          </div>
        </div>
      ) : (
        <>
          {recentTrips.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-gray-800">Recent trips</h2>
                <Link to="/trips" className="text-sm text-brand-600 hover:underline">View all</Link>
              </div>
              <div className="space-y-3">
                {recentTrips.map(trip => {
                  const totals = computeTripTotals(trip, foodMap, recipeMap)
                  const avgCalPerDay = trip.days.length > 0
                    ? Math.round(totals.calories / trip.days.length)
                    : 0
                  return (
                    <Link
                      key={trip.id}
                      to={`/trips/${trip.id}`}
                      className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-5 py-4 hover:border-gray-300 transition-colors"
                    >
                      <div>
                        <div className="font-medium text-gray-900 mb-0.5">{trip.name}</div>
                        <div className="text-xs text-gray-400">{trip.days.length} day{trip.days.length !== 1 ? 's' : ''}</div>
                      </div>
                      {totals.calories > 0 && (
                        <div className="text-right text-sm text-gray-500 shrink-0">
                          <div className="font-semibold text-brand-700">{avgCalPerDay.toLocaleString()} cal/day</div>
                          <div className="text-xs">{formatWeight(totals.weightG, weightUnit)} total</div>
                        </div>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          <div className="flex gap-3 flex-wrap">
            <Link to="/trips/new" className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700">
              + New trip
            </Link>
            <Link to="/recipes/new" className="border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
              + New recipe
            </Link>
            <Link to="/food" className="border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
              Manage food library
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
