import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { db } from '../db'
import { useSettingsStore } from '../store/settingsStore'
import { computeTripTotals, formatWeight } from '../utils/nutrition'
import { useLiveQuery } from '../hooks/useLiveQuery'
import {
  validateExport,
  previewImport,
  executeImport,
  buildLibraryExport,
  buildFullBackupExport,
  downloadAppExport,
} from '../utils/exportImport'
import type { AnyExport, DedupStrategy, ImportPreview } from '../utils/exportImport'
import { ImportModal } from '../components/ImportModal'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { FoodItem, Recipe } from '../types'

export function Dashboard() {
  const { weightUnit } = useSettingsStore()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingImport, setPendingImport] = useState<{ data: AnyExport; preview: ImportPreview } | null>(null)

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

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const raw = JSON.parse(await file.text())
      const data = validateExport(raw)
      const preview = await previewImport(data)
      setPendingImport({ data, preview })
    } catch (err) {
      alert(`Import failed: ${err instanceof Error ? err.message : 'the file does not appear to be a valid export.'}`)
    }
  }

  async function handleImportConfirm(strategy: DedupStrategy) {
    if (!pendingImport) return
    try {
      const newIds = await executeImport(pendingImport.data, strategy)
      setPendingImport(null)
      if (newIds.length === 1) navigate(`/trips/${newIds[0]}`)
    } catch (err) {
      alert(`Import failed: ${err instanceof Error ? err.message : 'unexpected error.'}`)
    }
  }

  async function handleExportBackup() {
    downloadAppExport(await buildFullBackupExport(), 'backup')
  }

  async function handleExportLibrary() {
    downloadAppExport(await buildLibraryExport(), 'library')
  }

  const dataActions = (
    <div className="flex items-center gap-2 flex-wrap">
      <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
        Import
      </Button>
      <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImportFile} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">Export <ChevronDown className="w-3.5 h-3.5" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[210px]">
          <DropdownMenuItem onClick={handleExportBackup}>
            <div>
              <div className="font-medium">Full backup</div>
              <div className="text-xs text-muted-foreground">All trips, food &amp; recipes</div>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportLibrary}>
            <div>
              <div className="font-medium">Food &amp; recipes library</div>
              <div className="text-xs text-muted-foreground">No trip data</div>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )

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
            <Button asChild>
              <Link to="/food">Add food items</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/recipes/new">Create a recipe</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/trips/new">Plan a trip</Link>
            </Button>
          </div>
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-3">Or restore from a previous export</p>
            {dataActions}
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

          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex gap-3 flex-wrap">
              <Button asChild>
                <Link to="/trips/new">+ New trip</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/recipes/new">+ New recipe</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/food">Manage food library</Link>
              </Button>
            </div>
            {dataActions}
          </div>
        </>
      )}

      {pendingImport && (
        <ImportModal
          preview={pendingImport.preview}
          onConfirm={handleImportConfirm}
          onCancel={() => setPendingImport(null)}
        />
      )}
    </div>
  )
}
