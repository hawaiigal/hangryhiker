import { useState, useMemo } from 'react'
import { db } from '../db'
import { useSettingsStore } from '../store/settingsStore'
import { calDensity, densityLabel, formatWeight } from '../utils/nutrition'
import { useLiveQuery } from '../hooks/useLiveQuery'
import { FoodItemForm } from '../components/FoodItemForm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageHeader } from '../components/PageHeader'
import type { FoodItem } from '../types'

type SortKey = 'name' | 'density'
type SortDir = 'asc' | 'desc'

// undefined = form closed; null = adding new; FoodItem = editing existing
type EditTarget = FoodItem | null | undefined

export function FoodLibrary() {
  const { weightUnit } = useSettingsStore()
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [editTarget, setEditTarget] = useState<EditTarget>(undefined)

  const allItems = useLiveQuery(() => db.foodItems.toArray(), [])

  const items = useMemo(() => {
    if (!allItems) return []
    const q = search.toLowerCase()
    const filtered = q
      ? allItems.filter(i =>
          i.name.toLowerCase().includes(q) || i.brand?.toLowerCase().includes(q)
        )
      : allItems

    return [...filtered].sort((a, b) => {
      const av = sortKey === 'name'
        ? a.name.toLowerCase()
        : calDensity(a.calories, a.servingSizeG, weightUnit)
      const bv = sortKey === 'name'
        ? b.name.toLowerCase()
        : calDensity(b.calories, b.servingSizeG, weightUnit)
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [allItems, search, sortKey, sortDir, weightUnit])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'density' ? 'desc' : 'asc')
    }
  }

  async function handleDelete(item: FoodItem) {
    if (item.id != null && confirm(`Delete "${item.name}"?`)) {
      await db.foodItems.delete(item.id)
    }
  }

  function sortIndicator(key: SortKey) {
    if (sortKey !== key) return null
    return <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  const thCls = 'pb-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide'
  const tdCls = 'py-3 pr-4 text-sm text-gray-600'

  return (
    <div>
      <PageHeader
        title="Food Library"
        action={
          <Button onClick={() => setEditTarget(null)}>+ Add food</Button>
        }
      />

      <Input
        type="search"
        placeholder="Search by name or brand..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="mb-6"
      />

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th
                className={`${thCls} pr-4 cursor-pointer hover:text-gray-800`}
                onClick={() => toggleSort('name')}
              >
                Name {sortIndicator('name')}
              </th>
              <th className={`${thCls} pr-4 hidden sm:table-cell`}>Serving</th>
              <th className={`${thCls} pr-4`}>Cal</th>
              <th
                className={`${thCls} pr-4 cursor-pointer hover:text-gray-800`}
                onClick={() => toggleSort('density')}
              >
                {densityLabel(weightUnit)} {sortIndicator('density')}
              </th>
              <th className={`${thCls} pr-4 hidden md:table-cell`}>Carbs</th>
              <th className={`${thCls} pr-4 hidden md:table-cell`}>Fiber</th>
              <th className={`${thCls} pr-4 hidden md:table-cell`}>Protein</th>
              <th className={`${thCls} pr-4 hidden md:table-cell`}>Fat</th>
              <th className={`${thCls} hidden lg:table-cell`}>Sodium</th>
              <th className={thCls} />
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className={`${tdCls} max-w-[160px]`}>
                  <div className="font-medium text-gray-900 truncate">{item.name}</div>
                  {item.brand && (
                    <div className="text-xs text-gray-400 truncate">{item.brand}</div>
                  )}
                </td>
                <td className={`${tdCls} hidden sm:table-cell whitespace-nowrap`}>
                  {formatWeight(item.servingSizeG, weightUnit)}
                </td>
                <td className={tdCls}>{item.calories}</td>
                <td className={`${tdCls} font-semibold text-brand-700 whitespace-nowrap`}>
                  {calDensity(item.calories, item.servingSizeG, weightUnit).toFixed(1)}
                </td>
                <td className={`${tdCls} hidden md:table-cell`}>{item.carbs}g</td>
                <td className={`${tdCls} hidden md:table-cell`}>{item.fiber}g</td>
                <td className={`${tdCls} hidden md:table-cell`}>{item.protein}g</td>
                <td className={`${tdCls} hidden md:table-cell`}>{item.fat}g</td>
                <td className={`${tdCls} hidden lg:table-cell`}>{item.sodium}mg</td>
                <td className="py-3 text-sm whitespace-nowrap">
                  <button
                    onClick={() => setEditTarget(item)}
                    className="text-gray-400 hover:text-brand-600 mr-3"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}

            {allItems !== undefined && items.length === 0 && (
              <tr>
                <td colSpan={10} className="py-16 text-center text-gray-400 text-sm">
                  {search
                    ? 'No food items match your search.'
                    : 'No food items yet. Add your first one!'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editTarget !== undefined && (
        <FoodItemForm
          item={editTarget ?? undefined}
          onClose={() => setEditTarget(undefined)}
        />
      )}
    </div>
  )
}
