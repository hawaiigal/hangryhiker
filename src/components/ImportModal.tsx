import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
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
    <Dialog open onOpenChange={open => { if (!open) onCancel() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import</DialogTitle>
        </DialogHeader>

        {isEmpty ? (
          <p className="text-sm text-muted-foreground">Nothing to import in this file.</p>
        ) : (
          <div className="text-sm text-gray-600 space-y-1">
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
          <div className="space-y-3">
            <p className="text-sm font-medium text-amber-700">
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
                    className="mt-0.5 accent-primary"
                  />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => onConfirm(strategy)} disabled={isEmpty}>Import</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
