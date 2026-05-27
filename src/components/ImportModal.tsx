import { useState } from 'react'
import type { DedupStrategy, ImportPreview } from '../utils/exportImport'

interface Props {
  preview: ImportPreview
  onConfirm: (strategy: DedupStrategy) => void
  onCancel: () => void
}

export function ImportModal({ preview, onConfirm, onCancel }: Props) {
  const conflictFoodCount = preview.conflictingFoodItems.length
  const conflictRecipeCount = preview.conflictingRecipes.length
  const hasConflicts = conflictFoodCount > 0 || conflictRecipeCount > 0
  const totalFood = preview.newFoodCount + conflictFoodCount
  const totalRecipes = preview.newRecipeCount + conflictRecipeCount
  const isEmpty = preview.tripCount === 0 && totalFood === 0 && totalRecipes === 0

  const [strategy, setStrategy] = useState<DedupStrategy>('skip')

  const conflictSummary = [
    conflictFoodCount > 0 && `${conflictFoodCount} food item${conflictFoodCount !== 1 ? 's' : ''}`,
    conflictRecipeCount > 0 && `${conflictRecipeCount} recipe${conflictRecipeCount !== 1 ? 's' : ''}`,
  ].filter(Boolean).join(' and ')

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Import</h2>

        {isEmpty ? (
          <p className="text-sm text-gray-400 mb-4">Nothing to import in this file.</p>
        ) : (
          <div className="text-sm text-gray-600 mb-4 space-y-1">
            {preview.tripCount > 0 && (
              <p>
                <span className="font-medium">{preview.tripCount} trip{preview.tripCount !== 1 ? 's' : ''}</span>
                {': '}
                {preview.tripNames.join(', ')}
              </p>
            )}
            {totalFood > 0 && (
              <p><span className="font-medium">{totalFood}</span> food item{totalFood !== 1 ? 's' : ''}</p>
            )}
            {totalRecipes > 0 && (
              <p><span className="font-medium">{totalRecipes}</span> recipe{totalRecipes !== 1 ? 's' : ''}</p>
            )}
          </div>
        )}

        {hasConflicts && (
          <div className="mb-5">
            <p className="text-sm text-amber-700 font-medium mb-3">
              {conflictSummary} already {conflictFoodCount + conflictRecipeCount === 1 ? 'exists' : 'exist'} in your library
            </p>
            <div className="space-y-2.5">
              {(
                [
                  ['skip', 'Skip — keep your existing items unchanged'],
                  ['overwrite', 'Overwrite — replace existing items with the imported ones'],
                  ['keep', 'Keep both — add as new items alongside existing ones'],
                ] as [DedupStrategy, string][]
              ).map(([value, label]) => (
                <label key={value} className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="dedup-strategy"
                    value={value}
                    checked={strategy === value}
                    onChange={() => setStrategy(value)}
                    className="mt-0.5 accent-brand-600"
                  />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:border-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(strategy)}
            disabled={isEmpty}
            className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Import
          </button>
        </div>
      </div>
    </div>
  )
}
