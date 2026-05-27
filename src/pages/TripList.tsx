import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { db } from '../db'
import { useSettingsStore } from '../store/settingsStore'
import { computeTripTotals, formatWeight } from '../utils/nutrition'
import { useLiveQuery } from '../hooks/useLiveQuery'
import { Button } from '@/components/ui/button'
import { PageHeader } from '../components/PageHeader'
import { ConfirmDialog } from '../components/ConfirmDialog'
import type { FoodItem, Recipe } from '../types'

export function TripList() {
  const { weightUnit } = useSettingsStore()
  const [pendingDelete, setPendingDelete] = useState<{ id: number; name: string } | null>(null)

  const trips = useLiveQuery(() => db.trips.toArray(), [])
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

  async function handleDeleteConfirm() {
    if (pendingDelete) await db.trips.delete(pendingDelete.id)
  }

  return (
    <div>
      <PageHeader
        title="Trips"
        action={
          <Button asChild>
            <Link to="/trips/new">+ New trip</Link>
          </Button>
        }
      />

      {trips && trips.length === 0 && (
        <div className="py-16 text-center text-gray-400 text-sm">
          No trips yet.{' '}
          <Link to="/trips/new" className="text-brand-600 hover:underline">
            Plan your first trip.
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {trips?.map(trip => {
          const totals = computeTripTotals(trip, foodMap, recipeMap)
          const avgCalPerDay = trip.days.length > 0
            ? Math.round(totals.calories / trip.days.length)
            : 0
          return (
            <div
              key={trip.id}
              className="bg-white border border-gray-200 rounded-xl px-5 py-4 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-medium text-gray-900 mb-1">{trip.name}</div>
                  <div className="text-xs text-gray-400 mb-2">
                    {trip.days.length} day{trip.days.length !== 1 ? 's' : ''}
                  </div>
                  {totals.calories > 0 && (
                    <div className="flex flex-wrap gap-x-4 text-sm">
                      <span className="text-gray-500">
                        Total{' '}
                        <span className="font-medium text-gray-800">
                          {formatWeight(totals.weightG, weightUnit)}
                        </span>
                      </span>
                      <span className="text-gray-500">
                        Total cal{' '}
                        <span className="font-medium text-gray-800">
                          {Math.round(totals.calories).toLocaleString()}
                        </span>
                      </span>
                      <span className="text-gray-500">
                        Avg/day{' '}
                        <span className="font-semibold text-brand-700">
                          {avgCalPerDay.toLocaleString()} cal
                        </span>
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex gap-3 text-sm shrink-0">
                  <Link to={`/trips/${trip.id}`} className="text-gray-400 hover:text-brand-600">
                    Open
                  </Link>
                  <button
                    onClick={() => setPendingDelete({ id: trip.id!, name: trip.name })}
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
        description="This will permanently delete the trip and all its days."
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
